const OBSWebsocket = require('obs-websocket-js');
const obs = new OBSWebsocket();

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
				persistent: false,
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

	const scenes = nodecg.Replicant('obs:scenes', undefined, {
		defaultValue: { scenes: [] },
		persistent: false
	});

	const currentScene = nodecg.Replicant('obs:currentScene', undefined, {
		defaultValue: undefined,
		persistent: false
	});

	const connected = nodecg.Replicant('obs:connected', undefined, {
		defaultValue: false,
		persistent: false
	});

	function connect(retries = 0) {
		connected.value = false;

		setTimeout(async () => {
			try {
				await obs.connect({
					address: 'localhost:4444',
					password: 'brendan'
				});
				connected.value = true;
			} catch (e) {
				// console.log(e);
				connect(retries++);
			}
		}, 5000);
	}

	async function fullUpdate() {
		try {
			let resp = await obs.send('GetSceneList');
			scenes.value = resp.scenes;
			currentScene.value = resp.currentScene;
		} catch (e) {
			console.log('Failure updating scenes.');
		}
	}

	obs.on('ConnectionOpened', fullUpdate);
	obs.on('SwitchScenes', fullUpdate);

	obs.on('ConnectionClosed', () => { connect(); });

	nodecg.listenFor('obs:SetCurrentScene', async sceneName => {
		try {
			await obs.send('SetCurrentScene', { 'scene-name': sceneName });
		} catch (e) {
			console.log('Failure switching scenes.', e);
		}
	});

	connect();
};
