var requirements = [
    'lib/hd/template.js',
];

System.init(requirements, function () {
    QUnit.test('Templating :: When Using Single Variable References', function (assert) {
        var cdoc = System.Templating.parse('${test}');

        assert.equal(cdoc.children.length, 1, 'Should produce one root child.');

        var child = cdoc.children[0];
        assert.equal(child.type, 'var', 'Should produce one child of type var.');
        assert.equal(child.payload, 'test', 'Should have one reference to the variable test.');
    });

    QUnit.test('Templating :: When Using Conditional Statements', function (assert) {
        var cdoc = System.Templating.parse('$if ((true && true)) content $endif');

        assert.equal(cdoc.children.length, 1, 'Should produce one root child.');

        var child = cdoc.children[0];
        assert.equal(child.type, 'condition', 'Should produce one child of type condition.');
        assert.equal(child.payload, '(true && true)', 'Should have condition set to true..');

        assert.equal(child.children.length, 1, 'Should produce one condition child.');

        var condition_child = child.children[0];
        assert.equal(condition_child.type, 'string', 'Should produce one child of type string.');
        assert.equal(condition_child.payload, ' content ', 'Should have string value set to content.');
    });

    QUnit.test('Templating :: When Using Conditional Statements with Nested References', function (assert) {
        var cdoc = System.Templating.parse('$if (true)${content}$endif');

        assert.equal(cdoc.children.length, 1, 'Should produce one root child.');

        var child = cdoc.children[0];
        assert.equal(child.type, 'condition', 'Should produce one child of type condition.');
        assert.equal(child.payload, 'true', 'Should have condition set to true..');

        assert.equal(child.children.length, 1, 'Should produce one condition child.');

        var condition_child = child.children[0];
        assert.equal(condition_child.type, 'var', 'Should produce one child of type var.');
        assert.equal(condition_child.payload, 'content', 'Should have on reference to the variable content.');
    });

    QUnit.test('Templating :: When Using Conditional Statements with Nested Conditional Statements', function (assert) {
        var cdoc = System.Templating.parse('$if (true)$if (true) content $endif$endif');

        assert.equal(cdoc.children.length, 1, 'Should produce one root child.');

        var child = cdoc.children[0];
        assert.equal(child.type, 'condition', 'Should produce one child of type condition.');
        assert.equal(child.payload, 'true', 'Should have condition set to true..');

        assert.equal(child.children.length, 1, 'Should produce one condition child.');

        var condition_child = child.children[0];
        assert.equal(condition_child.type, 'condition', 'Should produce one child of type condition.');
        assert.equal(condition_child.payload, 'true', 'Should have condition set to true.');

        var condition_child_child = condition_child.children[0];
        assert.equal(condition_child_child.type, 'string', 'Should produce one child of type string.');
        assert.equal(condition_child_child.payload, ' content ', 'Should have string value set to content.');
    });

    QUnit.test('Templating :: When Executing Template Documents', function (assert) {
        var cdoc = System.Templating.parse('$if (true)$if (true)${content}$endif$endif');
        var result = System.Templating._execute(cdoc, {'content': 'testing'});

        assert.equal(result, 'testing', 'Should produce correct output.');
    });

    QUnit.test('Templating :: When Executing Template Documents with Window Modifications', function (assert) {
        var cdoc = System.Templating.parse('$if (window.tainted = true) content $endif');
        var result = System.Templating._execute(cdoc, {'content': 'testing'});

        assert.ok(is_not_set(window.tainted), 'Should not taint window scope of original document');
        assert.equal(result, ' content ', 'Should produce correct output.');
    });
});
