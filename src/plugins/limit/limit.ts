/*!
 * Jodit Editor (https://xdsoft.net/jodit/)
 * Released under MIT see LICENSE.txt in the project root for license information.
 * Copyright (c) 2013-2022 Valeriy Chupurnov. All rights reserved. https://xdsoft.net
 */

/**
 * [[include:plugins/limit/README.md]]
 * @packageDocumentation
 * @module plugins/limit
 */

import type { IJodit, SnapshotType } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import {
	COMMAND_KEYS,
	INVISIBLE_SPACE_REG_EXP,
	SPACE_REG_EXP
} from 'jodit/core/constants';
import { stripTags } from 'jodit/core/helpers';
import { autobind } from 'jodit/core/decorators';
import { pluginSystem } from 'jodit/core/global';

import './config';

/**
 * Plugin control for chars or words count
 */
export class limit extends Plugin {
	/** @override **/
	protected afterInit(jodit: IJodit): void {
		const { limitWords, limitChars } = jodit.o;

		if (jodit && (limitWords || limitChars)) {
			let snapshot: SnapshotType | null = null;
			jodit.e
				.off('.limit')
				.on('beforePaste.limit', () => {
					snapshot = jodit.history.snapshot.make();
				})
				.on(
					'keydown.limit keyup.limit beforeEnter.limit beforePaste.limit',
					this.checkPreventKeyPressOrPaste
				)
				.on('change.limit', this.checkPreventChanging)
				.on('afterPaste.limit', (): false | void => {
					if (this.shouldPreventInsertHTML() && snapshot) {
						jodit.history.snapshot.restore(snapshot);
						return false;
					}
				});
		}
	}

	/**
	 * Action should be prevented
	 */
	private shouldPreventInsertHTML(
		event: KeyboardEvent | null = null,
		inputText: string = ''
	): boolean {
		if (
			event &&
			(COMMAND_KEYS.includes(event.key) || event.ctrlKey || event.metaKey)
		) {
			return false;
		}

		const { jodit } = this;
		const { limitWords, limitChars } = jodit.o;
		const text =
			inputText || (jodit.o.limitHTML ? jodit.value : jodit.text);

		const words = this.splitWords(text);

		jodit.e.fire('onLengthWords', words.length);
		jodit.e.fire('onLengthChars', words.join('').length);

		if (event && COMMAND_KEYS.includes(event.key)) {
			return false;
		}

		if (limitWords && words.length >= limitWords) {
			return true;
		}

		return Boolean(limitChars) && words.join('').length > limitChars;
	}

	/**
	 * Check if some keypress or paste should be prevented
	 */
	@autobind
	private checkPreventKeyPressOrPaste(event: KeyboardEvent): void | false {
		const { jodit } = this;

		if (this.shouldPreventInsertHTML(event)) {
			jodit.e.fire('onLimit', true);
			return false;
		} else {
			jodit.e.fire('onLimit', false);
		}
	}

	/**
	 * Check if some external changing should be prevented
	 */
	@autobind
	private checkPreventChanging(newValue: string, oldValue: string): void {
		const { jodit } = this;
		const { limitWords, limitChars } = jodit.o;

		const text = jodit.o.limitHTML ? newValue : stripTags(newValue),
			words = this.splitWords(text);

		jodit.e.fire('onLengthWords', words.length);
		jodit.e.fire('onLengthChars', words.join('').length);

		if (
			(limitWords && words.length > limitWords) ||
			(Boolean(limitChars) && words.join('').length > limitChars)
		) {
			jodit.e.fire('onLimitReplace', oldValue);
			jodit.value = oldValue;
		}
	}

	/**
	 * Split text on words without technical characters
	 */
	private splitWords(text: string): string[] {
		return text
			.replace(INVISIBLE_SPACE_REG_EXP(), '')
			.split(SPACE_REG_EXP())
			.filter(e => e.length);
	}

	/** @override **/
	protected beforeDestruct(jodit: IJodit): void {
		jodit.e.off('.limit');
	}
}

pluginSystem.add('limit', limit);
