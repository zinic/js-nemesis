# js-nemisis

[This is my Javascript library. There are many like it, but this one is mine.](http://en.wikipedia.org/wiki/Rifleman%27s_Creed).

## Code Sections

The js-nemisis library is comprised of several modules. At minimum, a user need
only include one module in order to begin using the library: the System module.

### System

The system module contains core components of js-nemisis. This is the only
module required to begin using the js-nemisis library.

**Logging**

The System module provides simple logging functionality.

```javascript
// Full Logging Options
var options = {
    // Enabling an html element will make the logger output to the element specified
    'use_html': { 'element': '#log' },

    // Enable logging to the javascript browser console
    'use_console': true
};

// Turn on our logging
System.enable_logging(options);

try {
    // Regular logging
    System.log('Hello world!');

    // Cause an exception
    throw 'Fail here';
} catch (exception) {
    // panic provides extra handling for exceptions such as stacktrace output
    System.panic(exception);
}

```

**Isolation**

The System module provides a code execution isolation function for evaluating
potentially unsafe javascript. Note: isolate does not provide any kind of
permission sandboxing, the javascript executed may still perform any function.
The isolation layer however will maintain original global scope of the window.

This allows for code to execute without fear of global variable pollution or
overwrites.

Isolate allows for a user to specifiy extended scope items as the second call
argument. All named items in the object passed will be linked into the isolated
window scope.

Lastly, isolate will return any value the isolated code returns. The value
itself will be inspected during this transition. Any value not of the
[following types](http://en.wikipedia.org/wiki/JSON#Data_types.2C_syntax_and_example)
will cause this inspection to fail and result in a thrown exception.


```javascript
window.message = 'original';

System.isolate(function () {
    window.message = message;
}, {'message': '12345'})

alert(window.message === 'original'); // Should be true
```

**Extension**

The System module provides a simple extension mechanisim for extending the
System namespace.

```javascript
System.extend('Templating', new TemplateManager());

System.Templating
```
