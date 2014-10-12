System.init([], function () {
    QUnit.test('System :: When Isolating Functions', function (assert) {
        var result = System.isolate(function () {
            window.tainted = true;
            return window.tainted;
        });

        assert.ok(result, 'Should pass results correctly.');
        assert.ok(is_not_set(window.tainted), 'Should not be allowed to taint window scope.');
    });

    QUnit.test('System :: When Isolating Functions with Context', function (assert) {
        var result = System.isolate(function () {
            return test;
        }, {'test': true});

        assert.ok(result, 'Should pass results correctly.');
    });
});

