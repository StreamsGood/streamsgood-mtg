const replicantDefaults = {
	name: '',
	deck: '',
	record: '0-0',
	life: 20,
	poison: 0,
	games: 0
};

module.exports = nodecg => {
	const game = {
		p1: {},
		p2: {}
	};

	Object.keys(game).forEach(player => {
		Object.keys(replicantDefaults).forEach(prop => {
			game[player][prop] = nodecg.Replicant(`${player}-${prop}`, {
				persistent: true,
				defaultValue: replicantDefaults[prop]
			});
		});
	});

	nodecg.listenFor('resetLifeTotals', () => {
		Object.keys(game).forEach(player => {
			['life', 'poison'].forEach(prop => {
				game[player][prop].value = replicantDefaults[prop];
			});
		});
	});

	nodecg.listenFor('resetAll', () => {
		Object.keys(game).forEach(player => {
			Object.keys(replicantDefaults).forEach(prop => {
				game[player][prop].value = replicantDefaults[prop];
			});
		});
	});
};
