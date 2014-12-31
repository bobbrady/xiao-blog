/**
 * xiao-blog - a small footprint blog designed for personal use
 * Copyright (c) 2014-2015, Bob Brady. 
 * Usage permitted under the terms of The MIT License, (MIT) 
 * https://github.com/bobbrady/xiao-blog
 */


/* jshint node: true */
"use strict";

var mongoose = require('mongoose'),
fs = require('fs'),
marked = require('marked'),
Post = mongoose.model('Post');

var getErrorMessage = function(err) {
  if(err.errors) {
    for (var errName in err.errors) {
      if(err.errors[errName].message) {
        return err.errors[errName].message;
      }
    }
  } else {
    return 'An unknown error was encountered';
  }
};

exports.list = function(req, res) {
  var options = buildPaginationOptions(req);
  Post.paginate(options, function(err, pagerInput) {
    if (err) {
      return res.status(400).send({
        message: getErrorMessage(err)
      });
    } else {
      var pager = buildPager(pagerInput);
      markupToHtml(pager);
      res.render('admin/admin-index', {
        posts: pager.posts,
        lessThanTime: pager.lessThanTime,
        greaterThanTime: pager.greaterThanTime,
        pages: pager.pages,
        page: pager.page,
        nextPage: pager.nextPage,
        prevPage: pager.prevPage,
        userFullName: req.user ? req.user.firstName + ' ' + req.user.lastName : '',
      });    
    }
  });
};  


exports.listByTag = function(req, res) {
  var options = buildPaginationOptions(req);
  options.criteria.tags = req.tagName;
  Post.paginate(options, function(err, pagerInput) {
    if (err) {
      return res.status(400).send({
        message: getErrorMessage(err)
      });
    } else {
      var pager = buildPager(pagerInput);
      markupToHtml(pager);
      res.render('admin/tag', {
        posts: pager.posts,
        lessThanTime: pager.lessThanTime,
        greaterThanTime: pager.greaterThanTime,
        pages: pager.pages,
        page: pager.page,
        nextPage: pager.nextPage,
        prevPage: pager.prevPage,
        tagName: pager.tagName,
        userFullName: req.user ? req.user.firstName + ' ' + req.user.lastName : '',
      });    
    }});
};  

exports.createForm = function(req, res) {
  res.render('admin/posts/create', {
    userFullName: req.user ? req.user.firstName + ' ' + req.user.lastName : ''
  });
};

exports.create = function(req, res) {
  var title = req.body.title,
  content = req.body.content,
  tags = req.body.tags.length > 0 ? req.body.tags.split(',') : [],
  uploads = req.body.uploadedFiles.length > 0 ? req.body.uploadedFiles.split(',') : [],
  published = req.body.published;

  var post = new Post({
    title: title,
    content: content,
    tags: tags,
    uploads: uploads,
    published: published,
    author: req.user
  });
  post.save(function(err) {
    if(err) {
       var error = getErrorMessage(err);
        req.flash('error', error);
        return res.redirect('/admin/posts');
    } else {
      // Tip from http://stackoverflow.com/questions/10352241/reload-a-page-after-res-redirectback-in-route
      res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
      res.redirect("/admin");
    }
  });
};

exports.updateForm = function(req, res) {
  var post = req.post;
  res.render('admin/posts/update', {
    post: post,
    title: 'Update a Post',
    userFullName: req.user ? req.user.firstName + ' ' + req.user.lastName : '',
  });
};

exports.update = function(req, res) {
  var post = req.post;
  post.title = req.body.title;
  post.content = req.body.content;
  post.published = req.body.published;
  if(req.body.tags) {
    post.tags = req.body.tags.split(',');
  }
  if(req.body.uploadedFiles) {
    post.uploads = req.body.uploadedFiles.split(',');
  }
  post.save(function(err) {
    if (err) {
       var error = getErrorMessage(err);
        req.flash('error', error);
        return res.redirect('admin/posts/update');
    } else {
      // Tip from http://stackoverflow.com/questions/10352241/reload-a-page-after-res-redirectback-in-route
      res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
      res.redirect("/admin");
    }
  });
};

exports.delete = function(req, res) {
  var post = req.post;
  (function next(err) {
    if (err) {
      return console.error("error deleting " + filename,  err);
    }
    if (post.uploads.length === 0) {
      return;
    }
    var filename = post.uploads.splice(0,1)[0];
    fs.unlink(filename, next);
  }());
  post.remove(function(err) {
    if(err) {
      return res.status(400).send({
        message: getErrorMessage()
      });
    } else {
      res.redirect("/admin");
    }
  });
};


function buildPaginationOptions(req) {
  var options = {};
  options.perPage = 4;
  options.page = req.param('page') > 1 ? parseInt(req.param('page'), 10) : 1; 
  options.lessThanTime = req.query.lessThanTime; 
  options.greaterThanTime = req.query.greaterThanTime; 
  options.criteria = {};
  return options;
}


function buildPager(pagerInput) {
  var pager = {};
  pager.page = pagerInput.options.page;
  pager.pages = Math.ceil(pagerInput.count /pagerInput.options.perPage);
  pager.nextPage = pager.page < pager.pages ? pager.page + 1 : 0;
  pager.prevPage = pager.page > 1 ? pager.page - 1 : 0;
  pager.tagName = pagerInput.options.criteria.tags;
  var posts = pagerInput.posts;
  if (posts && posts.length > 0) {
    // If getting previous page, reverse page list to be descending
    if (pagerInput.sortType === 'created') {
      posts.reverse();
    }
    pager.lessThanTime = posts[posts.length - 1].created.getTime();
    pager.greaterThanTime = posts[0].created.getTime();
  } else {
    pager.lessThanTime = 0;
    pager.greaterThanTime = 0;
  }
  pager.posts = posts;
  return pager;
}


function markupToHtml(pager) {
  /* jshint regexp:true */
  for (var idx = 0; idx < pager.posts.length; idx++) {
    var html = marked(pager.posts[idx].content);
    var excerpt = String(html).replace(/<\/?[^>]+>/gi, '');
    excerpt = excerpt.replace(/(\r\n|\n|\r)+/gm, ' ');
    excerpt = excerpt.split(' ').slice(0,50).join(' ');
    pager.posts[idx].excerpt = excerpt + "...";
  }
  /* jshint regexp:false */
}
