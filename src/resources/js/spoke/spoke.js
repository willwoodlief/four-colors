// @ts-check
"use strict";

class SpokeMap {

    /**
     * @type {Object<string, SpokeMember|SpokeHarmony|SpokeDot>} book 
     */
    book;
    constructor() {
        this.book = {};
    }
    /**
     * 
     * @param {string} uuid 
     * @returns {?SpokeHarmony|?SpokeDot|?SpokeMember}
     */
    getObject(uuid) {
        return this.book[uuid]??null;
    }

    /**
     * 
     * @param {string} uuid 
     * @param {SpokeMember|SpokeHarmony|SpokeDot} obj 
     */
    addObject(uuid,obj) {
        this.book[uuid] = obj;
    }
}

class SpokeMaster {
    static master;

    /**
     * @type {?SpokeHarmony} top_harmony
     */
    top_harmony;
    constructor() {
        this.book = new SpokeMap();
        this.top_harmony = null;
    }
    static {
        this.master = new SpokeMaster();
    }
    init() {
        if (this.top_harmony) {
            return;
        }
        this.top_harmony = new SpokeHarmony([]);
    }
}

class SpokeMember {
    /**
     * @type {string} guid 
     */
    guid; 

     /**
     * @type {string[]} parent_guids 
     */
    parent_guids;

    /**
     * @param {?string} [parent_guid]
     */
    constructor(parent_guid) {
        this.guid = crypto.randomUUID();
       
    
        this.parent_guids = [];
        if (parent_guid) {
            this.parent_guids.push(parent_guid);
        } 

        SpokeMaster.master.book.addObject(this.guid,this);
    }


     /**
     * @return {number}
     */
     get value() {
        return 0;
    }


}


class SpokeDot extends SpokeMember{
    /**
     * @type {number} value 
     */
    dot_value;

    /**
     * @param {number} value 
     * @param {?string} [parent_guid]
     */
    constructor(value,parent_guid) {
        super(parent_guid);
        this.dot_value = parseInt(value.toString());
    }

     /**
     * @return {number}
     */
     get value() {
        return this.dot_value;
    }
}

class SpokeHarmony extends SpokeMember {
    
     /**
     * @type {string[]} parent_guids 
     */
    members;
    
    /**
     * @param {string[]} members 
     * @param {?string} [parent_guid]
     */
    constructor(members,parent_guid) {
        super(parent_guid);
        if (!members) {members = [];}

        /**
         * @type {string[]}
         */
        this.members = [];
        for(let k = 0; k < members.length; k++) {
            this.#add_member(members[k]);
        }
    }

    /**
     * @param {string} guid 
     */
    #add_member(guid) {
        let child = SpokeMaster.master.book.getObject(guid);
        if (!child) {
            throw new Error("cannot find new child object "+ guid);
        }
        if (!this.members.includes(guid)) {
            this.members.push(guid);
        }
        
        if (!child?.parent_guids.includes(this.guid)) {
            child?.parent_guids.push(this.guid);
        }
    }

    /**
     * @param {string} guid 
     */
    #remove_member(guid) {
        let child = SpokeMaster.master.book.getObject(guid);
        if (!child) {
            throw new Error("cannot find departing child object "+ guid);
        }
        {
            let index = this.members.indexOf(guid);
            if (index !== -1) {
                this.members.splice(index, 1);
            }
        }

        {
            let parent_index = child.parent_guids.indexOf(guid);
            if (parent_index !== -1) {
                child.parent_guids.splice(parent_index, 1);
            }
        }
    }

    #clear_all_members() {
        for(let k = 0; k < this.members.length; k++) {
            let member_guid = this.members[k];
            this.#remove_member(member_guid);
        }
    }

    /**
     * @return {number}
     */
    get value() {
        return SpokeHarmony.#get_value(this.members,this.guid);
    }

   

    /**
     * 
     * @param {string[]} arr 
     * @param {string} keep 
     * @returns {string[][]}
     */
     static #subset_combination_keep(arr,keep) {
        const f = (/** @type {string | any[]} */ A, i=0) =>
             i == A.length ? [[]] : f(A, i+1).flatMap((/** @type {any} */ x) => [x, [A[i]].concat(x)]);
        let answer = [];
        let all = f(arr);
        for(let i=1; i < all.length; i++) {
            let da = all[i];
           
            if (! da.includes(keep) ) { continue; }
            if (da.length < 2) { continue; }
            answer.push(da);
        }
        return answer;
    }
    
    /**
     * @param {string[]} arr
     * @param {string} focus 
     * @param {string} context 
     * @return {string[]} returns the guids of the best collection
     */
    static #find_best_set(arr,focus,context) {
        let combos = SpokeHarmony.#subset_combination_keep(arr,focus);
       
        let min_val = 1000000;
        let ret = [];
        let focus_val = SpokeHarmony.#get_value([focus],context);
        for(let i = 0; i < combos.length; i++) {
            let da_combo = combos[i];
            let val = SpokeHarmony.#get_value(da_combo,context);
            //only keep if value of combo closer to zero than val, or the values are different signs
            if ( (val * focus_val <= 0 ) || (Math.abs(val) < Math.abs(focus_val))) {
                let abs_val = Math.abs(val);
                if ( abs_val < min_val) {
                    min_val = abs_val;
                    ret = da_combo;
                }
            } //end if can consider combo
        } //end for all combos
        return ret; //return best fit, or none
    }

    /**
    * builds a collection of this object and all parents and ancestors  
    * 
    * @param {string} some_guid
    * @param {?string} [context]
    * @return {Object<string,SpokeHarmony>} 
    */
     static #find_all_ancestors(some_guid, context) {
       if (!some_guid ) {return {};}
   
       let some_obj = SpokeMaster.master.book.getObject(some_guid);
       if (!(some_obj instanceof SpokeHarmony)) {return {};}
       if (!some_obj?.parent_guids?.length) {return {};}

       /**
        * @type {Object<string,SpokeHarmony>} ret;
        */
       let ret = {};
       if (!context || context !== some_obj.guid) {
        ret[some_obj.guid] = some_obj;
       }
       ret[some_obj.guid] = some_obj;
       for(let i = 0; i < some_obj.parent_guids.length; i++) {
           let working_guid = some_obj.parent_guids[i];
           if (working_guid in ret) { continue;}
           let maybe_paths = SpokeHarmony.#find_all_ancestors(working_guid) ;
           Object.assign(ret,maybe_paths);
       }
       return ret;
       
   }

     /**
     * 
     * @param {string} target_guid 
     * @param {string} context_guid 
     * @return {SpokeHarmony[]}
     * each parent has 0 or more ancestors that may or may not lead back to this context
     * each ancestor might have 0 or more ancestors that lead back to this context
     * ancestors might be duplicated (ancestor chains might cross)
     * we want all the distinct child harmonies, along with the harmony passed in, that have an ancestor of this context
     * the ordering does not matter
     */
    static #get_included_harmonies(target_guid,context_guid) {

        
        if (!target_guid) {return [];}
        let ans = SpokeHarmony.#find_all_ancestors(target_guid) ;
        let items = [];
        let remembered_guid_in_items = [];
        let context_obj = SpokeMaster.master.book.getObject(context_guid);
        if (!(context_obj instanceof SpokeHarmony)) {return [];}
        else
        {
            let item = {
                guid: context_guid,
                harmony : context_obj
            };
            items.push(item);
            remembered_guid_in_items.push(context_guid);
        }

        /**
         * @param {Object<string,SpokeHarmony> } wans 
         */
        function push_tree_item(wans) {
            for(let guid in ans) {
                let h = wans[guid]??null;
                if (!h) {continue;}
                for(let pi = 0; pi < h.parent_guids.length; pi++ ) {
                    let some_parent_guid = h.parent_guids[pi];
                    if (!remembered_guid_in_items.includes(guid)) {
                        let item = {
                            guid: guid,
                            parent_guid: some_parent_guid,
                            harmony : h
                        };
                        items.push(item);
                        remembered_guid_in_items.push(guid);
                        let memories = SpokeHarmony.#find_all_ancestors(some_parent_guid);
                        push_tree_item(memories);
                    }//end if not included before
                }// end for each parent of each ancestor 
            } //end for each ancestor   
        } //end function
        
        push_tree_item(ans);
       

        // Config object to set the id properties for the parent child relation
        let standardConfig =  { id : 'guid', parentid : 'parent_guid'};

        // Creates an array of trees. For this example there will by only one tree
        // @ts-ignore
        let trees = buildTrees(items, standardConfig);
        let context_node = null;
        for(let t = 0; t < trees.length; t++) {
            let some_tree = trees[t];
            let leaf_node = some_tree.getNodeById(context_guid);
            if (leaf_node) {
                context_node = leaf_node;
                break;
            }
        }

        if (!context_node) {return [];}

        let what = context_node.getDescendants();
        let ret = [];
        for(let i = 0; i < what.length; i++) {
            let harmony = what[i].dataObj.harmony;
            ret.push(harmony);
        }
        //add in the context obj if not already in there
        let n_found_context = -1;
        for(let i = 0; i < ret.length; i++) {
            if (ret[i].guid === context_guid) {
                n_found_context = i;
                break;
            }
        }
        if (n_found_context >= 0) {
            ret.splice(n_found_context,0);
        }
        return ret;
    }

    /**
     * @param {string[]} arr 
     * @param {string} context
     * @return {number}
     */
    static #get_value(arr,context) {
        let val = 0;
        for(let i = 0; i < arr.length; i++) {
            let obj = SpokeMaster.master.book.getObject(arr[i]);
            if (!obj) {continue;}
            //FIXME: not sure if the included charge is just those in the ancestor chain or everything hooked up
            let ancestors = SpokeHarmony.#get_included_harmonies(obj?.guid,context);
            let added_value = 0;
            for(let j = 0; j < ancestors.length; j++) {
                let an_ancestor = ancestors[j];
                if (an_ancestor.guid === context) {
                    continue;
                }
                added_value += an_ancestor.value;
            }
            val += obj.value + added_value;
        }
        
        return val;

    }

     /**
     * @param {string[]} its_members
     */
     #maybe_create_add_harmony(its_members) {
        if (!its_members || its_members.length === 0) {return;}
        let equals_members = its_members.every((item)=>this.members.includes(item))
        if (equals_members) {return;} //same child list, so its in general pop
        let nu = new SpokeHarmony(its_members,this.guid);
        this.#add_member(nu.guid);
        //remove set members from the top
        const members_in_common = this.members.filter( ( el ) => its_members.includes( el ) );
        for(let k = 0; k < members_in_common.length; k++) {
            let guid_in_common = members_in_common[k];
            this.#remove_member(guid_in_common);
        }
     }

     /**
      * returns ordered array from absolute charge max to min
      * @returns {string[]}
      */
     #splash() {
        let gui_list = this.members.slice();
        /**
         * @type {(SpokeMember)[]} obs
         */
        let obs = [];
        for(let i = 0; i < gui_list.length; i++) {
            let some_obj = SpokeMaster.master.book.getObject(gui_list[i]);
            if (!some_obj) { continue;}
            obs.push(some_obj);
        }
        obs.sort((a, b) => (Math.abs(a.value) > Math.abs(b.value)) ? 1 : -1)
       
        /**
         * @type {string[]} ret;
         */
        let ret = [];
        for(let i = 0; i < obs.length; i++) {
            ret.push(obs[i].guid);
        }
        return ret;
     }

     #rebuild() {
       let water = this.#splash() ;
       this.#clear_all_members();
       for(let i = 0; i < water.length; i++) {
         let thing = water[i];
         this.#add_member(thing);
         let best_set = SpokeHarmony.#find_best_set(this.members,thing,this.guid);
         this.#maybe_create_add_harmony(best_set)
       }
     }

     /**
      * 
      * @param {string} guid 
      */
     remove(guid) {
        this.#remove_member(guid);
        this.#rebuild();
     }


    /**
     * 
     * @param {string} guid 
     */
    add(guid) {
        let n = SpokeMaster.master.book.getObject(guid);
        if (!n) {throw new Error("Not object: " + guid);}
        if (! (n instanceof SpokeDot || n instanceof SpokeHarmony )) {
            throw new Error(`the guid ${guid} is incorrect object when added to ${this.guid}`);
        }
       
    
        const MAX_PICK = 5;
        const powered_members = this.#splash();
        let finalists = [];
        for(let i =0; i < powered_members.length; i++) {
            if (finalists.length >= MAX_PICK) { break;}
            let some_guid = powered_members[i];
            let nested = SpokeHarmony.#find_all_ancestors(some_guid,this.guid);
            if (!nested.length) { continue;}
            for(let j_guid  in  nested) {
                if (finalists.length >= MAX_PICK) { break;}
                let nested_obj = nested[j_guid];
                if (nested_obj.value * n.value < 0) {
                    if (finalists.length < MAX_PICK) {
                        if (!nested_obj.members.includes(n.guid)) {
                            finalists.push(nested_obj);
                        }
                    }
                }
            }
        } 
        if (!this.members.includes(n.guid)) {
            finalists.push(this);
        }

        if (!finalists.length) {
            throw new Error(`the guid ${guid} already belongs to ${this.guid} and any possible connects`);
        }
        
        //pick one
        let winner = finalists[Math.floor(Math.random() * finalists.length)];
        winner.#add_member(n.guid);
        let best_set = SpokeHarmony.#find_best_set(winner.members,guid,winner.guid);
        winner.#maybe_create_add_harmony(best_set);
       
    }

    /**
     * 
     * @return {JQuery}
     */
    draw() {
        return SpokeSimpleDraw.draw(this);
    }

   
}

class SpokeSimpleDraw {
    /**
     * @param {SpokeMember} member
     * @param {?JQuery} [el]
     * @return {JQuery}
     */
    static draw(member,el) {
        if (!el ) {
          el = $(`<div class="spoke-simple-draw-area"></div>`)   
        }
        let ella;
        if (member instanceof SpokeDot) {
           ella = $(`<p class="spoke-simple-draw-dot" data-guid="${member.guid}">${member.value}</p>`) ;
        } else if (member instanceof SpokeHarmony) {
            ella = $(`<div class="spoke-simple-draw-harmony" data-guid="${member.guid}"></div>`) ;
            for(let i =0; i < member.members.length; i++) {
                let child_guid = member.members[i];
                let child = SpokeMaster.master.book.getObject(child_guid);
                if (!child) {
                    debugger;
                    throw new Error("Not object: " + child_guid);
                } 
                SpokeSimpleDraw.draw(child,ella);
            }
        } else {
            console.error("bad object",member);
            throw new Error(` incorrect object when drawwing`);
        }

    
        el.append(ella);
        return el;
    }
}

