function DirectoryObject(name, path, type) {
    this.name = ko.observable(name);
    this.fullpath = ko.observable(path);
    this.type = ko.observable(type);
}

var tab_id = 0;
function Tab(file) {
    var self = this;
    self.id = ko.observable(tab_id);
    self.file = ko.observable(file);
    self.file_content = ko.observable();
    self.type = ko.observable();
    self.last_saved = ko.observable();

    self.saving = ko.observable(false);
    self.save_timeout = -1;
    self.saved = ko.observable(null);
    self.saved.subscribe(function(){
        self.save_timeout = setTimeout(function(){
            self.saved(null);
            self.save_timeout = -1;
        }, 5000)
    });

    self.tab_class = ko.observable();
    self.display = ko.observable();

    self.editor = null;
    self.mode = null;

    tab_id++;

    self.make_editor = function(textarea) {

        var modelist = ace.require('ace/ext/modelist');
        var langauge_tools = ace.require("ace/ext/language_tools");

        self.mode = modelist.getModeForPath(self.file().name()).mode;
        var editDiv = $('<div>', {
            position: 'absolute',
            width: $("#page").width(),
            height: $("#page").height() - 43,
            'class': textarea.attr('class')
        }).insertBefore(textarea);
        textarea.css('visibility', 'hidden');
        self.editor = ace.edit(editDiv[0]);
        self.editor.getSession().setValue(textarea.val());
        self.editor.getSession().setMode(self.mode);
        self.editor.setAutoScrollEditorIntoView(true);
        self.editor.setTheme("ace/theme/" + webinal.filemanager_settings().theme());
        self.editor.setOptions({
            fontSize: webinal.filemanager_settings().font_size() + "pt",
            enableBasicAutocompletion: true,
            enableSnippets: true,
            enableLiveAutocompletion: true
        });

        self.file_content(self.editor.getSession().getValue());
        self.editor.getSession().on('change', function(){
            self.file_content(self.editor.getSession().getValue());
        });
    }
}

var FileManagerViewModel = function() {
    var self = this;

    self.cwd = ko.observableArray();
    self.directories = ko.observableArray();
    self.files = ko.observableArray();
    self.tabs = ko.observableArray();
    self.selected_tab = ko.observable();
    self.clipboard = ko.observable();
    self.errors = ko.observableArray();
    self.go_path = ko.observable();

    self.file_menu = ko.observableArray([
        {
            text: "<i class='fa fa-file'></i> Open",
            action: function(data) { self.getFile(data); }
        }, {
            text: "<i class='fa fa-download'></i> Download",
            action: function(data) { self.downloadFile(data); }
        }, {
            text: "<i class='fa fa-edit'></i> Rename",
            action: function(data) { self.showRenameModal(data); }
        }, {
            text: "<i class='fa fa-tags'></i> Copy Location",
            action: function(data) { self.copyPath(data); }
        }, {
            separator: true
        }, {
            text: "<i class='fa fa-copy'></i> Copy",
            action: function(data) { self.copy(data); }
        }, {
            text: "<i class='fa fa-cut'></i> Cut",
            action: function(data) { self.cut(data); }
        }, {
            separator: true
        }, {
            text: "<i class='fa fa-trash-o'></i> Delete",
            action: function(data) { self.delete(data) }
        }, {
            separator: true
        }, {
            text: "<i class='fa fa-sliders'></i> Properties",
            action: function(data) {  }
        }
    ]);

    self.dir_menu = ko.observableArray([
        {
            text: "<i class='fa fa-file'></i> Open",
            action: function(data) { self.getDirectory(data.fullpath()); }
        }, {
            text: "<i class='fa fa-edit'></i> Rename",
            action: function(data) { self.showRenameModal(data); }
        }, {
            text: "<i class='fa fa-tags'></i> Copy Location",
            action: function(data) { self.copyPath(data); }
        }, {
            separator: true
        }, {
            text: "<i class='fa fa-copy'></i> Copy",
            action: function(data) { self.copy(data); }
        }, {
            text: "<i class='fa fa-cut'></i> Cut",
            action: function(data) { self.cut(data); }
        }, {
            text: "<i class='fa fa-paste'></i> Paste Into Folder",
            action: function(data) { self.paste(data); }
        }, {
            text: "<i class='fa fa-trash-o'></i> Delete",
            action: function(data) { self.delete(data) }
        }, {
            separator: true
        }, {
            text: "<i class='fa fa-sliders'></i> Properties",
            action: function(data) {  }
        }
    ]);

    self.tab_menu = ko.observableArray([
        {
            text: "<i class='fa fa-folder-open-o'></i> Open Directory",
            action: function(data) {
                path = data.file().fullpath();

                // windows
                if (path.indexOf("/") == -1) {
                    path = path.substring(0, path.lastIndexOf('\\'));
                }
                // unix
                else {
                    path = path.substring(0, path.lastIndexOf('/'));
                }

                self.getDirectory(path);
            }
        }, {
            text: "<i class='fa fa-tags'></i> Copy Location",
            action: function(data) {
                self.copyPath(data.file());
            }
        }, {
            text: "<i class='fa fa-refresh'></i> Reload",
            action: function(data) {
                self.reloadFile(data);
            }
        }, {
            separator: true
        }, {
            text: "<i class='fa fa-times-circle'></i> Close",
            action: function(data) { self.closeTab(data) }
        }
    ]);

    self.creating = ko.observable(false);
    self.create_error = ko.observable(new ErrorMessage());
    self.new_directory_object = ko.observable();

    self.createFile = function() {
        self.create_error(new ErrorMessage());

        var path = self.cwd()[self.cwd().length - 1].fullpath();
        self.new_directory_object(new DirectoryObject("", path, "file"));
        console.log(self.new_directory_object());
        $("#create-modal").modal();
    }


    self.createDirectory = function() {
        self.create_error(new ErrorMessage());

        var path = self.cwd()[self.cwd().length - 1].fullpath();
        self.new_directory_object(new DirectoryObject("", path, "directory"));
        $("#create-modal").modal();
    }

    self.createDirectoryObject = function() {
        self.creating(true);

        $.ajax({
            url: "/files/operation/create",
            type: "POST",
            data: {
                name: self.new_directory_object().name(),
                fullpath: self.new_directory_object().fullpath(),
                type: self.new_directory_object().type()
            },
            success: function() {
                self.reloadDirectory();
                $("#create-modal").modal('hide');

                //if the created object is a file, open it
                if(self.new_directory_object().type() == "file") {
                    file_path = self.new_directory_object().fullpath() + "/" + self.new_directory_object().name()
                    self.new_directory_object().fullpath(file_path)
                    self.getFile(self.new_directory_object());
                }
            },
            error: function(http) {
                self.create_error().error(true);
                self.create_error().message(http.responseText);
            },
            complete: function() {
                self.creating(false);
            }
        });
    }

    self.copyPath = function(dir_obj) {
        var clipboard = $('#clipboard');
        clipboard.val(dir_obj.fullpath());
        clipboard.select();
        try {
            var successful = document.execCommand('copy');
            var msg = successful ? 'successful' : 'unsuccessful';
            console.log('Copying text command was ' + msg);
        } catch (err) {
            console.log('Oops, unable to copy');
        }
    }

    self.uploading = ko.observable(false);
    self.upload_error = ko.observable(new ErrorMessage());
    self.upload_path = ko.observable();

    self.showUploadModal = function() {
        self.upload_error(new ErrorMessage());
        self.upload_path(self.cwd()[self.cwd().length - 1].fullpath());
        $("#upload-modal").modal();
    }

    self.upload = function() {
        $("form#upload").submit();
    }

    self.goToDirectory = function(d, e) {
        if(e.keyCode === 13) {
            $("#search_box").blur();
            self.getDirectory(self.go_path());
            $("#search_box").focus();
        }
        return true
    }

    self.getDirectory = function(path){

        $("#refresh_dir").addClass("faa-spin animated");

        var url = "/files/directory";
        if (path != null) {
            url += "?path=" + path
        }

        $.ajax({
            url: url,
            success: function(data) {
                self.cwd([]);
                self.directories([]);
                self.files([]);

                data = JSON.parse(data);
                $.each(data.cwd, function(i, dir){
                    self.cwd.push(new DirectoryObject(dir.name, dir.fullpath, dir.type));
                });

                $.each(data.dir_contents, function(i, dir){
                    if(dir.type == "directory") {
                        self.directories.push(new DirectoryObject(dir.name, dir.fullpath, dir.type));
                    } else {
                        self.files.push(new DirectoryObject(dir.name, dir.fullpath, dir.type));
                    }
                });

                self.directories.sort(function(left, right) {
                    var left_name = left.name().toLowerCase();
                    var right_name = right.name().toLowerCase();
                    return left_name == right_name ? 0 : (left_name < right_name ? -1 : 1);
                });

                self.files.sort(function(left, right) {
                    var left_name = left.name().toLowerCase();
                    var right_name = right.name().toLowerCase();
                    return left_name == right_name ? 0 : (left_name < right_name ? -1 : 1);
                });
            },
            error: function(http) {
                self.addError(http.responseText);
            },
            complete: function() {
                $("#refresh_dir").removeClass("faa-spin animated");
            }
        });
    }


    self.reloadDirectory = function() {
        path = self.cwd()[self.cwd().length - 1].fullpath();
        self.getDirectory(path);
    }


    self.getFile = function(data) {
        //check if file is already open
        var open = false;
        $.each(self.tabs(), function(i, tab) {
            if(tab.file().fullpath() == data.fullpath()) {
                self.selectTab(tab);
                open = true;
                return false;
            }
        });

        //if file not already open, fetch file
        if(!open) {
            var tab = new Tab(data);
            self.tabs.push(tab);
            self.selectTab(tab);
            self.fetchFile(data, tab);
        }
    }


    self.reloadFile = function(data) {
        data.saving(true);
        self.fetchFile(data.file(), data);
    }


    self.fetchFile = function(data, tab) {
        tab.saving(true);

        var url = "/files/file?path=" + data.fullpath();

        //send a HEAD request to check the content type of the file
        $.ajax({
            url: url,
            type: "HEAD",
            success: function(result, status, xhr){

                //do something based on the content type
                var ct = xhr.getResponseHeader("content-type");
                if(ct.startsWith("image")) {
                    tab.type("image");

                    var img = new Image();
                    img.src = url;
                    img.className = "tab-image";
                    $("#tab_content_" + tab.id()).html(img);
                } else if (ct == "application/pdf") {
                    tab.type("pdf");

                    var pdf = document.createElement("object");
                    pdf.type = "application/pdf";
                    pdf.value = "Adobe Reader is required for Internet Explorer."
                    pdf.data = url;
                    pdf.className = "tab-pdf";
                    $("#tab_content_" + tab.id()).html(pdf);
                } else if(ct.startsWith("video")) {
                    tab.type("video");

                    var video = "<video class='tab-video' controls>";
                    video += "<source src='" + url + "' />";
                    video += "</video>"
                    $("#tab_content_" + tab.id()).html(video);
                } else if(ct.startsWith("audio")) {
                    tab.type("audio");

                    var audio = "<audio class='tab-audio' controls>";
                    audio += "<source src='" + url + "' />";
                    audio += "</audio>"
                    $("#tab_content_" + tab.id()).html(audio);
                } else {
                    $.ajax({
                        url: url,
                        success: function(result, textStatus, request) {
                            tab.type("text");

                            if (ct == "application/json") {
                                result = JSON.stringify(result, null, 4);
                            }

                            tab.last_saved(request.getResponseHeader('File-Modified'));

                            var txt = document.createElement("textarea");
                            txt.value = result;
                            txt.className = "tab-text";
                            $("#tab_content_" + tab.id()).html(txt);

                            tab.make_editor($(txt));
                        }
                    });
                }
            },
            error: function(http) {
                self.addError(http.responseText);
            },
            complete: function() {
                tab.saving(false);
            }
        });
    }


    self.downloadFile = function(data) {
        var url = "/files/transfer?path=" + data.fullpath();
        window.location = url;
    }


    self.renamed_object = ko.observable();
    self.rename_error = ko.observable(new ErrorMessage());

    self.showRenameModal = function(data) {
        self.rename_error(new ErrorMessage());
        self.renamed_object(new DirectoryObject(data.name(), data.fullpath(), data.type()));
        $("#rename-modal").modal();
    }

    self.renaming = ko.observable(false);
    self.rename = function() {
        self.renaming(true);

        var data = new Object();
        data.name = self.renamed_object().name();
        data.fullpath = self.renamed_object().fullpath();
        data.type = self.renamed_object().type();

        $.ajax({
            url: "/files/operation/rename",
            type: "PUT",
            data: JSON.stringify(data),
            success: function() {
                self.reloadDirectory();
                $("#rename-modal").modal('hide');
            },
            error: function(http) {
                self.rename_error().error(true);
                self.rename_error().message(http.responseText);
            },
            complete: function() {
                self.renaming(false);
            }
        });
    }


    self.copy = function(data) {
        self.clipboard({ data: data, op: 'copy'});
    }


    self.cut = function(data) {
        self.clipboard({ data: data, op: 'move'});
    }


    self.paste = function(data) {
        var destination = data.fullpath();

        data = new Object();
        data.name = self.clipboard().data.name();
        data.fullpath = self.clipboard().data.fullpath();
        data.type = self.clipboard().data.type();
        data.destination = destination;

        var op = self.clipboard().op;

        $.ajax({
            url: "/files/operation/" + op,
            type: "PUT",
            data: JSON.stringify(data),
            success: function() {
                self.reloadDirectory();
            },
            error: function(http) {
                self.addError(http.responseText);
            },
            complete: function() {
                self.clipboard(null);
            }
        });
    }


    self.delete = function(data) {
        $.ajax({
            url: "/files/operation/delete",
            type: "DELETE",
            data: {
                name: data.name(),
                fullpath: data.fullpath(),
                type: data.type()
            },
            success: function() {
                self.reloadDirectory();
            },
            error: function(http) {
                self.addError(http.responseText);
            }
        });
    }

    self.saveFile = function(data) {
        data.saving(true);
        if(data.type() == "text") {
            $.ajax({
                url: "/files/file",
                type: "POST",
                data: { path: data.file().fullpath(), contents: data.file_content() },
                success: function(mtime) {
                    data.last_saved(mtime);
                    data.saving(false);
                    data.saved(true);
                },
                error: function(http) {
                    data.saving(false);
                    data.saved(false);
                    self.addError(http.responseText);
                }
            });
        } else {
            self.addError("Webinal can only save text files.");
        }
    }


    self.selectTab = function(tab) {
        $.each(self.tabs(), function(i, t){
            if(t == tab) {
                t.tab_class("active");
                t.display("block");
            } else {
                t.tab_class("");
                t.display("none");
            }
        });
    }


    self.closeTab = function(data){
        self.tabs.remove(data);

        var url = "/files/file?path=" + data.file().fullpath();

        $.ajax({
            url: url,
            type: "DELETE",
            success: function() {
            },
            error: function(http) {
                self.addError(http.responseText);
            }
        });
    }


    self.getTabs = function() {
        $.ajax({
            url: "/files/tabs",
            success: function(tabs) {
                $.each(tabs, function(i, tab){
                    var name = tab.FilePath.split('/').pop()
                    var d = new DirectoryObject(name, tab.FilePath, "text")
                    self.getFile(d);
                });
            },
            error: function(http) {
                self.addError(http.responseText);
            }
        });
    }


    self.addError = function(message) {
        var e = new ErrorMessage();
        e.error(true);
        e.message(message);

        self.errors.push(e);

        $("#error-icon").addClass("faa-ring animated");
        setTimeout(function() {
            $("#error-icon").removeClass("faa-ring animated");
        }, 500);
    }


    self.showErrors = function() {
        $("#error-modal").modal();
    }


    self.clearError = function(data) {
        self.errors.remove(data);
    }


    self.clearErrors = function() {
        self.errors([]);
        $("#error-modal").modal('hide');
    }
}

$(window).resize(function() {
    $(".tab-page .ace_editor").each(function() {
        $(this).height($("#page").height() - 43);
        $(this).width($("#page").width());
    })
    $.each(filemanager.tabs(), function(i, tab){
        if(tab.type() == "text")
            tab.editor.resize(true);
    })
});

$("#max_footer").click(function() {
    $(window).trigger('resize', function(){});
});

$("#min_footer").click(function() {
    $(window).trigger('resize', function(){});
});

$("#hide-nav").click(function() {
    $(window).trigger('resize', function(){});
});

$("form#upload").submit(function(){

    filemanager.uploading(true);

    var formData = new FormData($(this)[0]);

    $.ajax({
        url: "/files/transfer",
        type: 'POST',
        data: formData,
        success: function (data) {
            filemanager.reloadDirectory();
            $("#upload-modal").modal('hide');
        },
        error: function (http) {
            filemanager.upload_error().error(true);
            filemanager.upload_error().message(http.responseText);
        },
        complete: function() {
            filemanager.uploading(false);
        },
        cache: false,
        contentType: false,
        processData: false
    });

    return false;
});

$(window).bind('keydown', function(event) {
    if (event.ctrlKey || event.metaKey) {
        switch (String.fromCharCode(event.which).toLowerCase()) {
        case 's':
            event.preventDefault();

            var success = false;
            $.each(filemanager.tabs(), function(index, tab) {
                if(tab.tab_class() == "active") {
                    filemanager.saveFile(tab);
                    success = true;
                    return false;
                }
            });

            if(!success) {
               filemanager.addError("There was no active page to save.");
            }

            break;
        }
    }
});

var filemanager = new FileManagerViewModel();
ko.applyBindings(filemanager, document.getElementById("page-container"));


$(function() {
    filemanager.getTabs();
});
