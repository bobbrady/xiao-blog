"use strict";
/* xiao-blog.js
 *
 * XiaoBlog JavaScript Module
 *
 * Description: provides basic functionality to support Shao Blog.
 *  * Translation from markdown text to html for on-the-fly preview
 *  * XmlHttpRequests for uploading files and updating previews during creation-time
 *
 * Dependencies: 
 *  * marked.js, https://github.com/chjj/marked
 *  * jquery, //ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min.js
 *  * jquery.form, http://cdnjs.cloudflare.com/ajax/libs/jquery.form/3.51/jquery.form.min.js
 */
var xiaoBlog = (function() {

  // Privates
  var xiaoUploads = [],
  uploadList,
  uploadListHeader,
  hiddenField;

  // Requires marked function from markdown.js
  function markdownToHtml(textInputId, previewId) {
    var text = document.getElementById(textInputId);
    var preview = document.getElementById(previewId);
    preview.innerHTML = marked(text.value);
  }

  function previewMarkdown(textInputId, previewId, previewButtonId) {
    var text = "#" + textInputId;
    var preview = "#" + previewId;
    var previewBtn = "#" + previewButtonId;
    if ($(text).is(":visible")) {
      $(preview).html(marked($(text).val()));
      $(previewBtn).html("Edit");
      $(text).toggle();
      $(preview).toggle();
    } else {
      $(previewBtn).html("Preview");
      $(preview).toggle();
      $(text).toggle();
    } 
  }

  /* Requires jquery.form for the xhr.
   *
   * Called from view:
   *  <script>
   *    $(document).ready(function() { 
   *      xiaoBlog.initXhr("jsonForm", "uploadList", "uploadListHeader", "hiddenUploads");
   *    });
   *  </script>
   */
  function initXhr(jsonFormId, uploadListId, uploadListHeaderId, hiddenFieldId) {
    uploadList = uploadListId;
    uploadListHeader = uploadListHeaderId;
    hiddenField = hiddenFieldId;
    // Populate the uploads hidden and list fields
    if(document.getElementById(hiddenField).value) {
      xiaoUploads = document.getElementById(hiddenField).value.split(",");
      var ul = document.getElementById(uploadList);
      for(var i = 0; i < xiaoUploads.length; i++) {
        appendUploadToList(ul, xiaoUploads[i]);
      }
    }
    $('#' + jsonFormId).ajaxForm({ 
      dataType:  'json', 
      // Identify the function to invoke with server response 
      success:   processJson 
    }); 
    return false;
  }

  function captureHiddenFile(uploadFileId, visibleFileId) {
    $('input[id=' + uploadFileId +']').change(function() {
      $('#' + visibleFileId).val($(this).val().replace("C:\\fakepath\\", ""));
    });
  }

  /* Initializes contact form for parameter validation and ajax form posting on submittal */
  function initContactForm() {
    $("#contact-form").validate({
      rules: {
        contactName:{
          minlength: 3,
          maxlength: 20,
          required: true
        },
        contactEmail:{
          minlength: 3,
          maxlength: 20,
          required: true
        }
      },
      highlight: function (element) {
        $(element).closest('.form-group').removeClass('has-success').addClass('has-error');
      },
      unhighlight: function (element) {
        $(element).closest('.form-group').removeClass('has-error').addClass('has-success');
      }
    });

    $('#contact-form').submit(function(event) {
      var formData = {
        contactName: $("#contactName").val(),
        contactEmail: $("#contactEmail").val(),
        contactMessage: $("#contactMessage").val(),
        recaptcha: $("#g-recaptcha-response").val()
      };

      $.ajax({
        type    : 'POST', 
        url     : '/contact', 
        data    : JSON.stringify(formData), 
        dataType  : 'json', 
        contentType: 'application/json'
      }).done(function(data) {
        showContactMessages(data);
      });

      // Prevent form resubmittal and page refresh
      event.preventDefault();
    });
  }

  /* Gets the json data from uploaded image, adds it to the 
   * specified <ul> list as an <li> item, then updates the 
   * hidden uploads form field so that that the paths to all
   * uploads can be saved in the post document.
   *
   * Private
   */
  function processJson(data) { 
    // 'data' is the json object returned from the server 
    var uploadFile = data.uploadFile;
    xiaoUploads.push(uploadFile.path.replace("public", ""));
    var ul = document.getElementById(uploadList);
    appendUploadToList(ul, uploadFile.path);
    $('#' + uploadListHeader).removeClass('hidden');
    document.getElementById(hiddenField).value = xiaoUploads.toString();
  }

  // Private helper
  function appendUploadToList(uploadListElement, uploadFilePath) {
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(uploadFilePath.replace("public", "")));
    uploadListElement.appendChild(li);
  }

  // Private helper to show contact form success and error messages from json response
  function showContactMessages(json) {
    if(json.success) {
      $("#contact-messages").addClass("alert alert-success");
      $("#contact-messages").text("Contact form successfully submitted");
    } else {
      $("#contact-messages").addClass("alert alert-danger");
      $("#contact-messages").text(json.error);
    }
  }

  // Public functions
  return {
    markdownToHtml: markdownToHtml,
    previewMarkdown: previewMarkdown,
    initXhr: initXhr, 
    captureHiddenFile: captureHiddenFile, 
    initContactForm: initContactForm
  };
}());

