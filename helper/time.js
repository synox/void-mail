const millisecondsPerDay = 1000 * 3600 * 24;
exports.daysAgo = function (days) {
	return new Date(Date.now() - millisecondsPerDay * days)
}