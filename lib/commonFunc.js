'use babel';
import * as fetch from 'node-fetch';
import { dirname, basename } from 'path';
import * as fs from 'fs';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const extensionObj = {
  'plantuml': 'png',
  'cpp': 'cpp',
  'c_sharp': 'cs',
  'c_sharp_bob': 'cs',
  'gdscript': 'gd',
  'java_8': 'java',
  'javascript': 'js',
  'python_3': 'py',
  'rust': 'rs'
};

const view = {
  isOpened: false,
  temporarilyClosed: false
};

const saveFramepiledFile = async (frameSpecLocation, stateData) => {
  const filePath = dirname(frameSpecLocation),
        fileName = basename(frameSpecLocation, '.frm'),
        ext = extensionObj[stateData.currentlanguage],
        fullPath = `${filePath}/${fileName}.${ext}`;
  try {
    if (stateData.currentlanguage === 'plantuml') { // Save a PNG image in case of plantuml target
      const umlRes = await fetch(stateData.plantUmlUrl);
      const umlBuffer = await umlRes.buffer();
      return await writeFile(fullPath, umlBuffer);
    }
    await writeFile(fullPath, stateData.editorData);
  } catch (err) {
    console.log('Error while saving framepiled file', err);
    atom.notifications.addWarning(`There is an error occurred while saving the framepiled file (${fileName}.${ext}) on disk.`);
  }
}

const checkError = (frameSpecLocation) => {
  const errData = {
    errMsg: null,
    errDescription: null
  };
  // Handle unsaved files
  if (!frameSpecLocation) {
    errData['errMsg'] = 'Unsaved file';
    errData['errDescription'] = `Frame Machine Maker is only for Frames Spec. The files saved with '.frm' extention.`;
    return errData;
  }
  // Check extension (must be frm)
  const pathArr = frameSpecLocation.split('.');
  if (pathArr[pathArr.length - 1] !== 'frm') {
    errData['errMsg'] = 'Not a Frame specification file';
    errData['errDescription'] = `Frame Machine Maker is only for Frames Spec. The files saved with '.frm' extention.`;
  }
  return errData;
}

const destroyView = async () => {
  if (view.isOpened == null) return;
  const previewPane = isViewExists();
  if (previewPane) { // Not available when frame-machine-maker pane is manually closed
    await previewPane.destroyItem(previewPane.itemForURI(atom.config.get('frame-machine-maker.frameMachineMakerURI')));
  }
}

const showError = async (message, description, detail) => {
  if (isViewExists()) { // Not available when frame-machine-maker pane is manually closed
    view.temporarilyClosed = true;
    await destroyView(view);
  }
  atom.notifications.addError(message, {
    dismissable: true,
    ...description && {description},
    ...detail && {detail}
  });
}

const isViewExists = () => atom.workspace.paneForURI(atom.config.get('frame-machine-maker.frameMachineMakerURI'));

const encode64 = (data) => {
    let r = '';
    for (let i=0; i<data.length; i+=3) {
        if (i+2==data.length) {
            r +=append3bytes(data.charCodeAt(i), data.charCodeAt(i+1), 0);
        } else if (i+1==data.length) {
            r += append3bytes(data.charCodeAt(i), 0, 0);
        } else {
            r += append3bytes(data.charCodeAt(i), data.charCodeAt(i+1),
            data.charCodeAt(i+2));
        }
    }
    return r;
}

const append3bytes = (b1, b2, b3) => {
    let c1 = b1 >> 2;
    let c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
    let c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
    let c4 = b3 & 0x3F;
    let r = '';
    r += encode6bit(c1 & 0x3F);
    r += encode6bit(c2 & 0x3F);
    r += encode6bit(c3 & 0x3F);
    r += encode6bit(c4 & 0x3F);
    return r;
}

const encode6bit = (b) => {
    if (b < 10) {
      return String.fromCharCode(48 + b);
    }
    b -= 10;
    if (b < 26) {
      return String.fromCharCode(65 + b);
    }
    b -= 26;
    if (b < 26) {
      return String.fromCharCode(97 + b);
    }
    b -= 26;
    if (b == 0) {
      return '-';
    }
    if (b == 1) {
      return '_';
    }
    return '?';
}

const emptyUML = `@startuml
@enduml
`;

export {
  saveFramepiledFile,
  checkError,
  destroyView,
  showError,
  encode64,
  emptyUML,
  view
}
