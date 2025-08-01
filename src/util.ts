export const intervalToString = (ms: number): string => {
	const seconds = ms / 1000;
	const minutes = ms / (1000 * 60);
	const hours = ms / (1000 * 60 * 60);
	const days = ms / (1000 * 60 * 60 * 24);

	if (seconds < 60) {
		return `${seconds.toFixed(1)} secs`;
	} else if (minutes < 60) {
		return `${minutes.toFixed(1)} mins`;
	} else if (hours < 24) {
		return `${hours.toFixed(1)} hrs`;
	} else {
		return `${days.toFixed(1)} days`;
	}
};
