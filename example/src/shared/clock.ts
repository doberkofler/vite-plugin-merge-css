import './clock.css';

let clockIdCounter = 0;

const initClock = (id: string): void => {
	const el = document.getElementById(id);
	if (!(el instanceof HTMLElement)) {
		throw new Error(`Unable to initialize clock element with id "${id}"`);
	}

	const update = () => {
		el.textContent = new Date().toLocaleString();
	};
	update();
	setInterval(update, 1000);
};

export const clock = (): {clockHtml: string; clockInit: () => void} => {
	const id = `clock-${clockIdCounter++}`;

	return {
		clockHtml: `<span id="${id}" class="clock"></span>`,
		clockInit: initClock.bind(null, id),
	};
};
