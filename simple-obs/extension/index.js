const OBSWebSocket = require('obs-websocket-js');

const obs = new OBSWebSocket();

const MAX_RETRIES = 5;
let numberOfConnectionAttempts = 0;

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

	const reconnecting = nodecg.Replicant('obs:reconnecting', undefined, {
		defaultValue: false,
		persistent: false
	});

	async function connect(forced = false) {
		connected.value = false;
		reconnecting.value = true;
		numberOfConnectionAttempts += 1;

		try {
			await obs.connect({
				address: nodecg.bundleConfig.address,
				password: nodecg.bundleConfig.password
			});

			nodecg.log.info(`Connected to OBS. (Attempt #${numberOfConnectionAttempts})`);
			connected.value = true;
			reconnecting.value = false;
			numberOfConnectionAttempts = 0;
		} catch (e) {
			nodecg.log.error(`Failed to (re)connect to OBS. (Attempt #${numberOfConnectionAttempts})`);

			if (numberOfConnectionAttempts > MAX_RETRIES) {
				nodecg.log.error(`Giving up on (re)connect to OBS. (Attempt #${numberOfConnectionAttempts})`);
				reconnecting.value = false;
				return;
			}

			setTimeout(() => {
				connect();
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
		connected.value = false;

		if (!reconnecting.value) {
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
		connect(true);
	});

	connect();
};
