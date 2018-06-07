const OBSWebSocket = require('obs-websocket-js');

const obs = new OBSWebSocket();

module.exports = nodecg => {
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

	let isConnecting = false;

	async function connect(retries = 0) {
		if (retries > 19) {
			nodecg.log.error(`Failed to (re)connect to OBS after ${retries} attempts.`);
			isConnecting = false;
			return;
		}

		connected.value = false;
		isConnecting = true;

		try {
			await obs.connect({
				address: nodecg.bundleConfig.address,
				password: nodecg.bundleConfig.password
			});

			nodecg.log.info(`Connected to OBS. (Attempt #${retries + 1})`);
			connected.value = true;
			isConnecting = false;
		} catch (e) {
			nodecg.log.error(`Failed to (re)connect to OBS. (Attempt #${retries + 1})`);
			setTimeout(() => {
				connect(retries + 1);
			}, 10000);
		}
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

	obs.on('AuthenticationSuccess', fullUpdate);
	obs.on('SwitchScenes', fullUpdate);

	obs.on('ConnectionClosed', () => {
		if (!isConnecting) {
			connect();
		}
	});

	obs.on('error', e => {
		console.log(e);
	})

	nodecg.listenFor('obs:SetCurrentScene', async sceneName => {
		try {
			await obs.send('SetCurrentScene', { 'scene-name': sceneName });
		} catch (e) {
			console.log('Failure switching scenes.', e);
		}
	});

	nodecg.listenFor('obs:ManualConnect', async () => {
		connect();
	});

	connect();
};
