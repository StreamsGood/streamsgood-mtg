const fs = require('fs');
const path = require('path');

function localeSort(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

module.exports = (nodecg, obs) => {
  const vodSceneName = nodecg.bundleConfig.vodSceneName;
  const vodSourceName = nodecg.bundleConfig.vodSourceName;

  const selectedFile = nodecg.Replicant('selected-file', undefined, {
    defaultValue: ''
  });

  const fileList = nodecg.Replicant('file-list', undefined, {
    defaultValue: [],
    persistent: false
  });

  const fileDirectory = nodecg.Replicant('file-directory', undefined, {
    defaultValue: '/'
  });

  let filePathSetSuccessfully = false;

  async function setRerunFile(newFile, oldFile) {
    nodecg.log.info(`Setting VOD to ${newFile}`);
    if (newFile == oldFile || oldFile == undefined) {
      return;
    }

    // Apparently this just works because scene names are globally unique.
    try {
      await obs.send('SetSourceSettings', {
        'sourceName': vodSourceName,
        'sourceSettings': {
          'local_file': newFile
        }
      });
      filePathSetSuccessfully = true;
    } catch (e) {
      nodecg.log.error(`Failed to set Rerun file path. Assignment will be attempted when the selected scene is switched to.`, e);
      filePathSetSuccessfully = false;
    }
  }

  obs.on('SwitchScenes', (data) => {
    if (data.sceneName == vodSceneName && !filePathSetSuccessfully) {
      setRerunFile(selectedFile.value, true);
    }
  });

  selectedFile.on('change', setRerunFile);

  fileDirectory.on('change', (newDirectory) => {
    try {
      const files = fs.readdirSync(newDirectory);
      files.push('..');

      fileList.value = files.sort(localeSort).map(file => {
        const absolutePath = path.resolve(newDirectory, file);
        const lstat = fs.lstatSync(absolutePath);

        return {
          name: file,
          path: absolutePath,
          extension: path.extname(file),
          isFile: lstat.isFile(),
          isDirectory: lstat.isDirectory(),
          isSymbolicLink: lstat.isSymbolicLink()
        };
      });
    } catch (e) {
      fileList.value = [];
    }
  });

  nodecg.listenFor('traverse-directory', relativePath => {
    try {
      fileDirectory.value = path.resolve(fileDirectory.value, relativePath);
    } catch (e) {
      fileDirectory.value = '/';
    }
  });
};
