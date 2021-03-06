/*
 *     Copyright (C) 2010-2016 Marvell International Ltd.
 *     Copyright (C) 2002-2010 Kinoma, Inc.
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

class FilesHost {
	static deleteFile(path) @ "xs_files_delete";
	static renameFile(from, to) @ "xs_files_rename";
	static getInfo(path) @ "xs_files_getFileInfo";
	static deleteVolume(path) @ "xs_files_deleteVolume";
	static getVolumeInfo(path) @ "xs_files_getVolumeInfo";
	static getSpecialDirectory(name) @ "xs_files_getSpecialDirectory";
	static fsck(path, recovery) @ "xs_files_fsck";
	static setActive(path) @ "xs_files_setActive";
	static _init() @ "xs_files_init";

};

class IteratorHost @ "xs_files_iterator_destructor" {
	constructor(path) @ "xs_files_iterator_constructor";
	getNext() @ "xs_files_iterator_getNext";
	close() @ "xs_files_iterator_close";
};

class VolumeIteratorHost @ "xs_volume_iterator_destructor" {
	constructor() @ "xs_volume_iterator_constructor";
	getNext() @ "xs_volume_iterator_getNext";
};

function* Iterator(path, flags) {
	let i = path.indexOf("/", path.startsWith('/') ? 1 : 0), vol, rest;
	if (i >= 0) {
		vol = path.substring(0, i);
		rest = path.substring(i + 1);
		if (rest.length == 0)
			rest = null;
		else if (rest.charAt(rest.length - 1) != '/')
			rest += "/";
	}
	else {
		vol = path;
		rest = null;
	}
	let iter = new IteratorHost(vol), item;
	let nameSet = new Set();
	let itemArray = new Array();
	while (item = iter.getNext()) {
		if (!rest || item.name.startsWith(rest)) {
			let name = (!rest) ? item.name : item.name.substring(rest.length);
			if (!flags) {
				i = name.indexOf("/");
				if (i >= 0) {
					name = name.substring(0, i);
					if (nameSet.has(name))
						continue;
					nameSet.add(name);
				}
			}
			item.name = name;
			itemArray.push(item);
		}
	}
	itemArray.sort(function(a,b) { if (a.name > b.name) return 1; else if (a.name < b.name) return -1; else return 0});
	for (i = 0; i < itemArray.length; i++)
		yield itemArray[i];
	iter.close();
};

function* VolumeIterator() {
	let iter = new VolumeIteratorHost();
	let item;
	while ((item = iter.getNext()) != null) {
		yield item;
	}
};

export default class Files extends FilesHost {
	static deleteDirectory(path) {
		if (!path.startsWith("/"))
			path = "/" + path;
		if (path.charAt(path.length - 1) != '/')
			path += "/";

		// check if the path is a volume
		let iter = this.VolumeIterator();
		for (let item of iter) {
			if ((item.path + "/") == path) {
				this.deleteVolume(item.path);
				return true;
			}
		}
		// iterate all files in the directory
		// (includes files in the sub directories)
		iter = this.Iterator(path, 1);
		for (let item of iter) {
			this.deleteFile(path + item.name);
		}
		return true;
	};
	static read(path) {
		try {
			let File = require("file");
			let f = new File(path, 0);
			let blob = f.read(undefined, f.length);
			f.close();
			return blob;
		} catch(e) {
			// return undefined
		}
	};
	static write(path, blob) {
		let File = require("file");
		let f = new File(path, 1);
		f.write(blob);
		f.close();
	};

	static get applicationDirectory() { return this.getSpecialDirectory("applicationDirectory"); };
	static get preferencesDirectory() { return this.getSpecialDirectory("preferencesDirectory"); };
	static get documentsDirectory() { return this.getSpecialDirectory("documentsDirectory"); };
	static get picturesDirectory() { return this.getSpecialDirectory("picturesDirectory"); };
	static get temporaryDirectory() { return this.getSpecialDirectory("temporaryDirectory"); };
	static get variableDirectory() { return this.getSpecialDirectory("variableDirectory"); };

	static get nativeApplicationDirectory() { return this.getSpecialDirectory("nativeApplicationDirectory"); };

	static Iterator(path, flags) {
		return Iterator(path, flags);
	};
	static VolumeIterator() {
		return VolumeIterator();
	};
};

Files.directoryType = "directory";
Files.fileType = "file";

Files._init();
delete Files._init();
