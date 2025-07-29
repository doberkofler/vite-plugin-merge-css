import {extractEntries} from '../merge';
//import {type ManifestType} from '../manifest';
import {expect, test} from 'vitest';

test('extractEntries', () => {
	expect(extractEntries({})).toStrictEqual([]);
});
