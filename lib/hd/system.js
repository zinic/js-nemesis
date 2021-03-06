window.get_or = function (value, or) {
    return is_set(value) ? value : or;
};

window.is_set = function (value) {
    return value !== null && value !== undefined;
};

window.is_not_set = function (value) {
    return !is_set(value);
};

window.is_empty = function (value) {
    return !is_set(value) || value.length == 0;
};

window.get_query_param = function (name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
};

(function () {
    var _TAB_AS_NBSP = '&nbsp;&nbsp;&nbsp;&nbsp;'

    function SystemCore() {
        var log_output = '';

        this.logging_element = undefined;
        this.initializers = {};
        this.panicked = false;

        this.extend = function (name, obj) {
            if (this[name] != undefined) {
                throw 'Name clash for module: ' + name;
            }

            var init_func = obj['init'];
            if (init_func != undefined) {
                this.initializers[name] = init_func;
            }

            this[name] = obj;
        };

        this.log = function (msg) {
            if (is_not_set(this.logging_element)) {
                return;
            }

            var output = '';

            if (is_set(msg)) {
                // Do some type negotiation if the msg is set
                if (typeof msg === 'string' || msg instanceof String) {
                    output = this._format_string(msg);
                } else if (msg instanceof Error) {
                    output = this._format_exception(msg);
                } else {
                    output = this._format_string(JSON.stringify(msg, null, '\t'));
                }
            } else {
                // null or unset message means clear the output
                log_output = '';
            }

            // append our new output
            log_output += output;

            // paint it
            this.logging_element.html(log_output);
        };

        this.enable_logging = function (target_element) {
            var target = is_set(target_element) ? $(target_element) : $(document.body);
            var html = target.html() + '<div id="logging-pane"></div>';
            target.html(html);

            // Set our element reference
            this.logging_element = $('#logging-pane');
        };

        this.disable_logging = function () {
            // if the logging reference is set, remove it from the dom
            if (is_set(this.logging_element)) {
                this.logging_element.remove();
                this.logging_element = undefined;
            }
        };

        this._format_string = function (str, prefix) {
            var formatted = '';

            var lines = str.split(/\n/);
            for (var i in lines) {
                formatted += '<div>';

                if (is_set(prefix)) {
                    formatted += prefix;
                }

                formatted += lines[i] + '</div>\n';
            }

            return formatted;
        };

        this._format_exception = function (ex) {
            var formatted = '';

            if (is_set(ex.stack)) {
                formatted = this._format_string(ex.stack, _TAB_AS_NBSP);
            }

            return formatted;
        };

        this.panic = function (msg) {
            this.log(msg);
            this.panicked = true;
        };

        this.isolate = function (closure, context) {
            // Create a new iframe
            $(document.body).append('<iframe id="isolation-frame" style="display: none;" />');

            // Get the new iframe's window reference
            var isoframe = $('#isolation-frame');
            var isowin = isoframe[0].contentWindow;
            var weval = isowin.eval;

            // Copy context over into the new window reference
            if (is_set(context)) {
                for (var key in context) {
                    var ctxval = context[key];

                    switch (typeof ctxval) {
                        case 'function':
                            // protect functions from being serialized
                            break;

                        default:
                            ctxval = System.clone(ctxval);
                    }

                    isowin[key] = ctxval;
                }
            }

            // Suss out what are code is
            var code = '';
            switch (typeof closure) {
                case 'function':
                    // Check if we can get the source to this function
                    if (is_not_set(closure.toSource)) {
                        throw 'Invalid closure type. Function provided does not have a .toSource() function.'
                    }

                    // Force the invocation of the function
                    code = '('
                    code += closure.toSource();
                    code += ')();'
                    break;

                case 'string':
                    code = closure;
                    break;

                default:
                    throw 'Invalid closure type. Expected string of javascript code or a javascript function with the .toSource() method available';
            }

            // Run the code
            var result = weval.call(isowin, code);

            // Cleanup the frame
            isoframe.remove();

            // return the captured result - right now I serialize this so that
            // any non-serializeable components force an exception throw
            return System.clone(result);
        };

        this.include = function (path, on_completion) {
            $.ajax({
                url: path,
                dataType: 'text',

                success: function (data) {
                    System.log('Loading ' + path + '...');

                    try {
                        with ({'System': window.System}) {
                            eval(data);
                        }

                        System.log('Module ' + path + _TAB_AS_NBSP + '[OK]');

                        on_completion();
                   } catch (exception) {
                        System.log('Module ' + path + _TAB_AS_NBSP + '[FAILED]');
                        System.panic(exception);
                    }
                },

                error: function (err) {
                    System.panic(err);
                }
            });
        };

        this.clone = function (obj) {
            if (is_set(obj)) {
                return JSON.parse(JSON.stringify(obj));
            }

            return obj;
        };

        this.init = function (requirements, main_hook) {
            var initializers_active = 0;
            var libraries_loading = 0;

            var check_for_completion = function () {
                if (libraries_loading == 0 && initializers_active == 0) {
                    main_hook();
                }
            }

            System.log('Loading libraries...');

            for (var i in requirements) {
                var library = requirements[i];
                libraries_loading++;

                this.include(library, function () {
                    libraries_loading--;
                    check_for_completion();
                });
            }

            System.log('Activating modules');

            for (var name in this.initializers) {
                var initializer = this.initializers[name];
                initializers_active++;

                try {
                    initializer(function () {
                        initializers_active--;
                        check_for_completion();
                    });
                } catch(e) {
                    System.panic('Failed to load module ' + name);
                }
            }

            if (initializers_active == 0 && libraries_loading == 0) {
                check_for_completion();
            }
        }
    }

    window.System = new SystemCore();
})();
