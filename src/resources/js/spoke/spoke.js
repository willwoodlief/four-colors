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
     * @returns {SpokeHarmony|SpokeDot|SpokeMember}
     */
    getObject(uuid) {
        let val =  this.book[uuid]??null;
        if (!val) {
            if (!val) {throw new Error("Not object: " + uuid);}
        }
        return val;
    }

     /**
     * 
     * @param {string} uuid 
     * @returns {?SpokeHarmony|?SpokeDot|?SpokeMember}
     */
     getObjectOrNull(uuid) {
        return  this.book[uuid]??null;
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
     * @type {SpokeHarmony} top_harmony
     */
    top_harmony;
    constructor() {
        this.book = new SpokeMap();
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
     * @type {number} value 
     */
    dot_value;

    /**
     * @param {?string} [parent_guid]
     * @param {?string} [premade_own_guid]
     */
    constructor(parent_guid,premade_own_guid) {
        if (premade_own_guid) {
            this.guid = premade_own_guid;
        } else {
            this.guid = crypto.randomUUID();
        }
        
       this.dot_value = 0;
    
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
        return this.dot_value;
    }


}


class SpokeDot extends SpokeMember{
    

    /**
     * @param {number} value 
     * @param {?string} [parent_guid]
     * @param {?string} [premade_own_guid]
     */
    constructor(value,parent_guid,premade_own_guid) {
        super(parent_guid,premade_own_guid);
        this.dot_value = parseInt(value.toString());
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
     * @param {?string} [premade_own_guid]
     */
    constructor(members,parent_guid,premade_own_guid) {
        super(parent_guid,premade_own_guid);
        if (!members) {members = [];}

        /**
         * @type {string[]}
         */
        this.members = [];
        for(let k = 0; k < members.length; k++) {
            this.add_member(members[k]);
        }

    }

    /**
     * @param {string} guid 
     */
    add_member(guid) {
        let child = SpokeMaster.master.book.getObject(guid);
       
        if (!this.members.includes(guid)) {
            this.members.push(guid);
        }
        
        if (!child?.parent_guids.includes(this.guid)) {
            child?.parent_guids.push(this.guid);
        }

        this.dot_value = SpokeHarmony.#get_value(this.members,this.guid);
    }

    /**
     * @param {string} guid 
     */
    #remove_member(guid) {
        let child = SpokeMaster.master.book.getObject(guid);
    
        {
            let index = this.members.indexOf(guid);
            if (index !== -1) {
                this.members.splice(index, 1);
            }
        }

        {
            let parent_index = child.parent_guids.indexOf(this.guid);
            if (parent_index !== -1) {
                child.parent_guids.splice(parent_index, 1);
            }
        }

        this.dot_value = SpokeHarmony.#get_value(this.members,this.guid);
    }

    #clear_all_members() {
        for(let k = 0; k < this.members.length; k++) {
            let member_guid = this.members[k];
            this.#remove_member(member_guid);
        }
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
    * @param {?number} [max_level]
    * @return {Object<string,SpokeHarmonyDistance>} 
    */
    static #find_all_ancestors(some_guid, context,max_level) {
      // @ts-ignore
      return SpokeHarmony.#find_all_ancestors_or_descendants(some_guid,context,'parent_guids',max_level);
    }

     /**
    * builds a collection of this object and all children and descenants 
    * 
    * @param {string} some_guid
    * @param {?string} [not_include_this_guid]
    * @param {?number} [max_level]
    * @return {Object<string,SpokeHarmonyDistance>} 
    */
     static find_all_descendants(some_guid,not_include_this_guid,max_level) {
        if (!not_include_this_guid) {not_include_this_guid = null;}
        return SpokeHarmony.#find_all_ancestors_or_descendants(some_guid,not_include_this_guid,'members',max_level);
      }

   /**
    * builds a collection of this object and all parents or ancestors  , context not included
    * 
    * @param {string} some_guid
    * @param {?string} context
    * @param {string} search_type parent_guids|members 
    * @param {?number} [max_level]
    * @param {?number} [current_level]
    * @return {Object<string,SpokeHarmonyDistance>} 
    */
   static #find_all_ancestors_or_descendants(some_guid, context,search_type,max_level,current_level) {
    if (!some_guid ) {return {};}
    if (!max_level) {max_level = null;}
    if (!current_level) {current_level = 0;}
    current_level++;
    if (max_level && max_level > 0) {
        if (current_level > max_level) {
            return {};
        }
    }
    if(! ['parent_guids','members'].includes(search_type) ) {
        throw new Error("search type has to be 'parent_guids','members'")
    }

    let some_obj = SpokeMaster.master.book.getObject(some_guid);
    
    /**
     * @type {Object<string,SpokeHarmonyDistance>} ret;
     */
    let ret = {};
    if (!context || context !== some_obj.guid) {
     ret[some_obj.guid] = new SpokeHarmonyDistance(some_obj,current_level);
    }
    
    if (!some_obj[search_type]?.length) {return ret;}

    ret[some_obj.guid] = new SpokeHarmonyDistance(some_obj,current_level); 
    for(let i = 0; i < some_obj[search_type].length; i++) {
        let working_guid = some_obj[search_type][i];
        if (working_guid in ret) { continue;}
        let maybe_paths = SpokeHarmony.#find_all_ancestors_or_descendants(working_guid,context,search_type,max_level,current_level) ;
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

        //TODO: I am pretty sure this allows cyclable relationships, if so need to figure out how to find such things
        if (!target_guid) {return [];}
        let items = [];
        let remembered_guid_in_items = [];

        /**
         * 
         * @param {string} some_guid 
         */
        function add_guid_to_items(some_guid) {
            let ans = SpokeHarmony.#find_all_ancestors(some_guid) ;
        
            let some_obj = SpokeMaster.master.book.getObject(some_guid);
            if (some_obj instanceof SpokeHarmony) {
                let item = {
                    guid: some_guid,
                    harmony : some_obj
                };
                items.push(item);
                remembered_guid_in_items.push(some_guid);
            }

            push_tree_item(ans);
        }
        

        /**
         * @param {Object<string,SpokeHarmonyDistance> } wans 
         */
        function push_tree_item(wans) {
            for(let guid in wans) {
                let h = wans[guid]??null;
                if (!h) {continue;}
                for(let pi = 0; pi < h.harmony.parent_guids.length; pi++ ) {
                    let some_parent_guid = h.harmony.parent_guids[pi];
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
                if (h.harmony.parent_guids.length === 0) {
                    if (!remembered_guid_in_items.includes(guid)) {
                        let item = {
                            guid: guid,
                            harmony : h
                        };
                        items.push(item);
                        remembered_guid_in_items.push(guid);
                    }
                }
            } //end for each ancestor   
        } //end function
        
        add_guid_to_items(context_guid);
        add_guid_to_items(target_guid);
       

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
            val += obj.value;
        }
        
        return val;

    }

     /**
     * @param {string[]} its_members
     */
     #maybe_create_add_harmony(its_members) {
        if (!its_members || its_members.length === 0) {return;}
        let equals_members = its_members.every((item)=>this.members.includes(item))
        if (equals_members && this.members.length === its_members.length) {return;} //same child list, so its in general pop
        let nu = new SpokeHarmony(its_members,this.guid);
        this.add_member(nu.guid);
        //remove set members from the top
        const members_in_common = this.members.filter( ( el ) => its_members.includes( el ) );
        for(let k = 0; k < members_in_common.length; k++) {
            let guid_in_common = members_in_common[k];
            this.#remove_member(guid_in_common);
        }
     }

     /**
      * returns ordered array from absolute charge max to min
      * @param {boolean} [b_harmony_only]
      * @returns {string[]}
      */
     #splash(b_harmony_only) {
        b_harmony_only = !!b_harmony_only;
        let gui_list = this.members.slice();
        /**
         * @type {(SpokeMember)[]} obs
         */
        let obs = [];
        for(let i = 0; i < gui_list.length; i++) {
            let some_obj = SpokeMaster.master.book.getObject(gui_list[i]);
            if(b_harmony_only) {
                if (!(some_obj instanceof SpokeHarmony)) {continue;}
            }
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
         this.add_member(thing);
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
        if (! (n instanceof SpokeDot || n instanceof SpokeHarmony )) {
            throw new Error(`the guid ${guid} is incorrect object when added to ${this.guid}`);
        }
        //cannot add something that already has this in descents somewhere
        let loop_check = SpokeHarmony.find_all_descendants(n.guid,this.guid);
        if (Object.keys(loop_check).includes(this.guid)) {
            throw new Error(`cannot add as new member guid ${guid} because we are in a chain including this ${this.guid}`);
        }

        if (this.members.includes(guid)) {
            throw new Error(`cannot add as new member guid ${guid} because its already a member of this ${this.guid}`);
        }
    
        
        const powered_members = this.#splash(true);

        /**
         * @type {SpokeHarmonyDistance[]}
         */
        let finalists = [];

         /**
         * @type {Object<string,SpokeHarmonyDistance>}
         */
        let candidate_harmonies = {};

        let my_guid = this.guid;
        for(let i =0; i < powered_members.length; i++) {
            let some_guid = powered_members[i];
            /**
             * @type {Object<string,SpokeHarmonyDistance>}
             */
            let some_ancestors;

             /**
             * @type {Object<string,SpokeHarmonyDistance>}
             */
             let some_children;

             /**
             * @type {Object<string,SpokeHarmonyDistance>}
             */
             let nested = {};
            
            some_ancestors = SpokeHarmony.#find_all_ancestors(some_guid,null,2);
            some_children = SpokeHarmony.find_all_descendants(some_guid,null,2);
            
            Object.assign(nested,some_ancestors, some_children);
            let candidate_harmonies_guids = Object.keys(nested)
                                                    .filter(e=> ((e !== my_guid )) && (nested[e].harmony instanceof SpokeHarmony) );
        
            for (const guid_you of candidate_harmonies_guids) {
                candidate_harmonies[guid_you] = nested[guid_you];
            }
        } //end each powered member

        for(let j_guid  in  candidate_harmonies) {
                
            let nested_obj = candidate_harmonies[j_guid];
            if (nested_obj.harmony.value * n.value < 0) {
                // @ts-ignore
                if (!nested_obj.harmony.members.includes(n.guid)) {
                    finalists.push(nested_obj);
                }
            }
        }

        finalists.push(new SpokeHarmonyDistance(this,0));
        
        /**
         * 
         * @param {SpokeHarmonyDistance} a 
         * @return {number}
         */
        function calc_charge_distance(a) {
            //TODO: distance is logrithmic in calc
            return Math.abs(a.harmony.value + n.value) + Math.abs(a.distance);    
        }

        //sort finalist array by how close to 0 each value to the new addition is
        //because only values that are opposite are considered, then  the smallest number will always closest to zero
        finalists.sort((a, b) => (
            calc_charge_distance(a) > calc_charge_distance(b)
            ) 
            ? 1 : -1
        );
        let lowest_value = calc_charge_distance(finalists[0]);
        let ultra_finalist = finalists.filter(e=> (calc_charge_distance(e) === lowest_value ));
        //pick one of the lowest
        let winner = ultra_finalist[Math.floor(Math.random() * ultra_finalist.length)];
        winner.harmony.add_member(n.guid);
        let best_set = SpokeHarmony.#find_best_set(winner.harmony.members,guid,winner.harmony.guid);
        winner.harmony.#maybe_create_add_harmony(best_set);
       
    }

    /**
     * 
     * @return {JQuery}
     */
    draw() {
        return SpokeSimpleDraw.draw(this);
    }

   
}

class SpokeHarmonyDistance {
    /**
     * @type {SpokeHarmony} 
     */
    harmony;

    /**
     * @type {number} 
     */
    distance;

    /**
     * 
     * @param {SpokeHarmony|SpokeDot|SpokeMember} harmony 
     * @param {number} distance 
     */
    constructor(harmony,distance) {
        // @ts-ignore
        this.harmony = harmony;
        this.distance = distance;
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
           ella = $(`<p class="spoke-simple-draw-dot spoke-action" data-guid="${member.guid}">${member.value}</p>`) ;
        } else if (member instanceof SpokeHarmony) {
            ella = $(`<div class="spoke-simple-draw-harmony spoke-action" data-guid="${member.guid}"></div>`) ;
            for(let i =0; i < member.members.length; i++) {
                let child_guid = member.members[i];
                let child = SpokeMaster.master.book.getObject(child_guid);
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

