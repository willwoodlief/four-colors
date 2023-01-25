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
    constructor() {
        this.book = new SpokeMap();
    }
    static {
        this.master = new SpokeMaster();
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
     * @param {string} parent_guid
     * @return {void}
     */
    add_parent(parent_guid) {
        if (parent_guid && !this.parent_guids.includes(parent_guid)) {
            this.parent_guids.push(parent_guid);
        } 
    }

    
    /**
     * @param {string} parent_guid
     * @return {void}
     */
    remove_parent(parent_guid) {
        let index = this.parent_guids.indexOf(parent_guid);
        if (index !== -1) {
            this.parent_guids.splice(index, 1);
        }
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
        return this.value;
    }
}

class SpokeHarmony extends SpokeMember {
    
     /**
     * @type {string[]} parent_guids 
     */
    members;
    
    /**
     * @param {string[]} members 
     * @param {?string} parent_guid
     */
    constructor(members,parent_guid) {
        super(parent_guid);

        /**
         * @type {string[]}
         */
        this.members = [];
        if (members.length) {this.members = members;}
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
        let context_obj = SpokeMaster.master.book.getObject(context_guid);
        if (!(context_obj instanceof SpokeHarmony)) {return [];}
        else
        {
            let item = {
                guid: context_guid,
                harmony : context_obj
            };
            items.push(item);
        }
        
        for(let guid in ans) {
            let h = ans[guid];
            for(let pi = 0; pi < h.parent_guids.length; pi++ ) {
                let item = {
                    guid: guid,
                    parent_guid: h.parent_guids[pi],
                    harmony : h
                };
                items.push(item);
            }
        }   

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

        let what = leafNode.getDescendants();
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
        if (its_members.length === this.members.length) {return;} //its in general pop
        let nu = new SpokeHarmony(its_members,this.guid);
        this.members.push(nu.guid);
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
       this.members = [];
       this.members = [];
       for(let i = 0; i < water.length; i++) {
         let thing = water[i];
         this.members.push(thing);
         let best_set = SpokeHarmony.#find_best_set(this.members,thing,this.guid);
         this.#maybe_create_add_harmony(best_set)
       }
     }

     /**
      * 
      * @param {string} guid 
      */
     remove(guid) {
        if (!this.members.includes(guid)) {
            throw new Error(this.guid + " not a member of " + guid);
        }
        let index = this.members.indexOf(guid);
        if (index !== -1) {
            this.members.splice(index, 1);
        }
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
        n.add_parent(winner.guid);
        winner.members.push(guid);
        let best_set = SpokeHarmony.#find_best_set(winner.members,guid,winner.guid);
        winner.#maybe_create_add_harmony(best_set)
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
           ella = $(`<p class="spoke-simple-draw-dot">${member.value}</p>`) ;
        } else if (member instanceof SpokeHarmony) {
            ella = $(`<div class="spoke-simple-draw-harmony"></div>`) ;
            for(let i =0; i < member.members.length; i++) {
                let child_guid = member.members[i];
                let child = SpokeMaster.master.book.getObject(child_guid);
                if (!child) {throw new Error("Not object: " + child_guid);} 
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

