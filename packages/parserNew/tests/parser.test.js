const assert = require('node:assert/strict');
const test = require('node:test');

const { classifyIcon, parseIconName } = require('../.test-build/parser');

test('parses variants used by the reference icon library', () => {
    assert.deepEqual(parseIconName('ArrowDown'), { name: 'ArrowDown', variant: 'regular' });
    assert.deepEqual(parseIconName('ArrowDownBold'), { name: 'ArrowDown', variant: 'bold' });
    assert.deepEqual(parseIconName('ArrowWideDownOutline'), { name: 'ArrowWideDown', variant: 'outline' });
    assert.deepEqual(parseIconName('ArrowWideDownOutlineBold'), {
        name: 'ArrowWideDown',
        variant: 'outline-bold',
    });
    assert.deepEqual(parseIconName('ArrowWideDownFill'), { name: 'ArrowWideDown', variant: 'fill' });
});

test('normalizes slash-based and legacy icon names', () => {
    assert.deepEqual(parseIconName('24 / Operation / 24_share_screen_outline'), {
        name: 'ShareScreen',
        variant: 'outline',
    });
    assert.deepEqual(parseIconName('Player / ic_36_pause_outline'), {
        name: 'Pause',
        variant: 'outline',
    });
});

test('extracts category and group from the reference frame hierarchy', () => {
    assert.deepEqual(
        classifyIcon(
            [
                { name: 'Navigation & Movement', width: 700 },
                { name: 'Icons', width: 700 },
                { name: 'Arrow', width: 652 },
                { name: 'Arrow', width: 568 },
            ],
            'ArrowDownBold',
            16,
        ),
        { category: 'Navigation & Movement', group: 'Arrow' },
    );
});

test('removes a compact icon-family wrapper from the group path', () => {
    assert.deepEqual(
        classifyIcon(
            [
                { name: 'Navigation & Movement', width: 700 },
                { name: 'Icons', width: 700 },
                { name: 'Chevron', width: 652 },
                { name: 'ChevronCircleDown', width: 64 },
            ],
            'ChevronCircleDownOutlineBold',
            16,
        ),
        { category: 'Navigation & Movement', group: 'Chevron' },
    );
});
