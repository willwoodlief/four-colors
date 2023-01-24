(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){(function (){
var exports = {};

var builder = require("./lib/builder.js");
exports.buildTrees = builder.buildTrees;
global.window.buildTrees = exports.buildTrees;
module.exports = exports;

}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./lib/builder.js":2}],2:[function(require,module,exports){
const treefunctions = require('./treefunctions.js');

var exports = {};

let createDetachedNode = null;

// Builds trees based on an object array object and a config object which defines the parent child id relationship
exports.buildTrees = function(objectArray, config) {
  if(!objectArray) throw 'objectArray is mandatory';
  if(!config) throw 'config is mandatory';
  if(!config.id) throw 'config property id is not set';
  if(!config.parentid) throw 'config property parentid is not set';

  this.config = config;

  createDetachedNode = function (dataObj) {
    const node = {};

    node.id = dataObj[config.id];
    node.parentid = dataObj[config.parentid];
    node.children = [];
    node.dataObj = dataObj;
    node.collectionnames = [];

    //functions added from treefunctions object
    node.addChild = treefunctions.addChild;
    node.removeChild = treefunctions.removeChild;
    node.addParent = treefunctions.addParent;
    node.removeParent = treefunctions.removeParent;
    node.getAncestors = treefunctions.getAncestors;
    node.getDescendants = treefunctions.getDescendants;
    node.getRecursiveCollection = treefunctions.getRecursiveCollection;
    node.getRecursiveNodeData = treefunctions.getRecursiveNodeData;
    node.getSingleNodeData = treefunctions.getSingleNodeData;
    node.isAncestorOf = treefunctions.isAncestorOf;
    node.isDescendantOf = treefunctions.isDescendantOf;
    node.isLeaf = treefunctions.isLeaf;
    node.removeAllDescendants = treefunctions.removeAllDescendants;

    if(this.getNodeById) {
      const parentNode = this.getNodeById(node.parentid);

      if(!parentNode) throw 'Could not find parent node. Does not belong to tree';

      parentNode.addChild(node);
    }

    return node;
  }

  const trees = [];
  const rootNodes = [];
  const nodeById = {};

  for (var i = 0; i < objectArray.length; i++) {
    const obj = objectArray[i];
    const node = createDetachedNode(obj);
    nodeById[obj[config.id]] = node;

    if(!obj[config.parentid]) {
      rootNodes.push(node);
    }
  }

  for (var i = 0; i < objectArray.length; i++) {
    const obj = objectArray[i];
    const node = nodeById[obj[config.id]];
    const parentId = node.dataObj[config.parentid];

    if(parentId) {
      var parentNode = nodeById[parentId];
      node.addParent(parentNode);
    } else {
      node.parent = null;
    }
  }

  for (var i = 0; i < rootNodes.length; i++) {
    const rootNode = rootNodes[i];
    const tree = createTree(rootNode, nodeById);
    tree.config = config;
    tree.createDetachedNode = createDetachedNode;

    trees.push(tree);
  }

  return trees;
}

// Creates a tree by a defined root node and a nodeById dictionary
var createTree = function(rootNode, nodeById) {
  if(!rootNode) throw 'rootNode is mandatory';
  if(!nodeById) throw 'nodeById is mandatory';

  const tree = {};
  tree._nodeById = nodeById;

  const getNodeById = function(id) {
    return tree._nodeById[id];
  }

  tree.rootNode = rootNode;
  tree.addData = treefunctions.addData;

  tree.createNode = function (dataObj) {
    const result = tree.createDetachedNode(dataObj);

    tree._nodeById[result.id] = result;

    return result;
  }

  tree.getNodeById = getNodeById;

  return tree;
}

module.exports = exports;

},{"./treefunctions.js":3}],3:[function(require,module,exports){
var exports = {};

// Removes child. Node function
const removeChild = function(childNode) {
  childNode.removeParent();
}

// Adds a child. Node function
const addChild = function(childNode) {
  this.children.push(childNode);

  if(childNode.parent !== this) {
    childNode.parent = this;
  }
}

// Adds (sets) a paren. Node function
const addParent = function(parentNode) {
  this.parent = parentNode;

  if(this.parent.children.indexOf(this) === -1) {
    this.parent.addChild(this);
  }
}

// Removes the parent. Node function
const removeParent = function() {
  if(!this.parent) return;

  var thisChildIndex = this.parent.children.indexOf(this);

  if(thisChildIndex > -1) {
    this.parent.children.splice(thisChildIndex, 1)
  } else {
    throw 'Node has no parent';
  }

  this.parent = null;
}

// Adds data to a nodes based on the references in the objectArray. Config defines collection name and the reference id to attach the data items to the nodes. Tree function
const addData = function(objectArray, config) {
  if(!objectArray) throw 'objectArray is mandatory';
  if(!config) throw 'config is mandatory';

  for (var i = 0; i < objectArray.length; i++) {
    var obj = objectArray[i];
    var node = this.getNodeById(obj[config.referenceid]);

    if(!node[config.collectionname]) {
      node[config.collectionname] = [];
      node.collectionnames.push(config.collectionname);
    }

    node[config.collectionname].push(obj);
  }
}

// Gets all the data for the node. Node function
const getSingleNodeData = function() {
  let result = [];

  for (let i = 0; i < this.collectionnames.length; i++) {
    const collectionName = this.collectionnames[i];
    result = result.concat(this[collectionName]);
  }

  return result;
}

// Gets all the data for the node and its descendants. Node function
const getRecursiveNodeData = function(filterFunction) {
  let result = [];

  if(filterFunction) {
    const singleNodeData = this.getSingleNodeData();

    if(singleNodeData && singleNodeData.length > 0) {
      for(let i=0;i<singleNodeData.length;i++) {
        const dataItem = singleNodeData[i];

        if(filterFunction(dataItem)) {
          result.push(dataItem);
        }
      }
    }
  } else {
    result = result.concat(this.getSingleNodeData());
  }

  for (var i = 0; i < this.children.length; i++) {
    const childNode = this.children[i];
    result = result.concat(childNode.getRecursiveNodeData(filterFunction));
  }

  return result;
}

//Gets all collection data by name for a node and its descendants. Node function
const getRecursiveCollection = function(collectionname) {
  let result = [];

  if(this[collectionname]) {
    result = result.concat(this[collectionname]);
  }

  for (let i = 0; i < this.children.length; i++) {
    const childNode = this.children[i];
    result = result.concat(childNode.getRecursiveCollection(collectionname));
  }

  return result;
}

// Gets all descendants for a node. Node function
const getDescendants = function() {
  let result = [];

  for (var i = 0; i < this.children.length; i++) {
    const descendant = this.children[i];
    result.push(descendant);
    result = result.concat(descendant.getDescendants());
  }

  return result;
}

// Gets all ancedstors for a node. Node function
const getAncestors = function() {
  let result = [];

  if(this.parent) {
    result.push(this.parent);
    result = result.concat(this.parent.getAncestors());
  }

  return result;
}

// Checks if a node is a descendant of the node. Node function
const isDescendantOf = function(node) {
  for (let i = 0; i < node.children.length; i++) {
    const descendant = node.children[i];

    if(descendant === this) return true;
    if(this.isDescendantOf(descendant)) return true;
  }

  return false;
}

// Checks if a node is an ancestor of the node. Node function
const isAncestorOf = function(node) {
  for (let i = 0; i < this.children.length; i++) {
    const descendant = this.children[i];

    if(descendant === node) return true;
    if(descendant.isAncestorOf(node)) return true;
  }

  return false;
}

// Cheks os the node is a leaf node. Node function
const isLeaf = function() {
  return this.children.length === 0;
}

// Removes all descendants for the node. Node function
const removeAllDescendants = function() {
  for (let i = 0; i < this.children.length; i++) {
    const childNode = this.children[i];
    childNode.parent = null
  }

  this.children = [];
}

// Exports all the functions
exports.addChild = addChild;
exports.removeChild = removeChild;
exports.addParent = addParent;
exports.removeParent = removeParent;
exports.addData = addData;
exports.getSingleNodeData = getSingleNodeData;
exports.getRecursiveNodeData = getRecursiveNodeData;
exports.getRecursiveCollection = getRecursiveCollection;
exports.getDescendants = getDescendants;
exports.getAncestors = getAncestors;
exports.isDescendantOf = isDescendantOf;
exports.isAncestorOf = isAncestorOf;
exports.isLeaf = isLeaf;
exports.removeAllDescendants = removeAllDescendants;

module.exports = exports;

},{}]},{},[1]);
