// An array where the items has a parent child reference using id properties
let items = [{ guid : 'a' },{ guid : 'z' }, { guid : 'b', parent_guid : 'a' }, { guid : 'c', parent_guid : 'a' },
             { guid : 'd', parent_guid : 'z' }, { guid : 'e', parent_guid : 'c',data: {apple:333} }];

// Config object to set the id properties for the parent child relation
let standardConfig =  { id : 'guid', parentid : 'parent_guid'};

// Creates an array of trees. For this example there will by only one tree
let trees = buildTrees(items, standardConfig);
console.log('tree',trees);

var tree = trees[0];
var rootNode = tree.rootNode;
var leafNode = tree.getNodeById('c');

var isDescendant = leafNode.isDescendantOf(rootNode); //returns true
var isAncestor = rootNode.isAncestorOf(leafNode); //returns true
console.log('ancestor',isAncestor);
console.log('isDescendant',isDescendant);
console.log('rootNode',rootNode);

let what = leafNode.getDescendants();
console.log('answer',what);

// ----------------


