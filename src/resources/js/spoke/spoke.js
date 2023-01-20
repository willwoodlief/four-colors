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


}


class SpokeDot extends SpokeMember{
    /**
     * @type {number} value 
     */
    value;

    /**
     * @param {number} value 
     * @param {?string} [parent_guid]
     */
    constructor(value,parent_guid) {
        super(parent_guid);
        this.value = parseInt(value.toString());
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
     * @param {string[]} arr 
     * @param {string} context
     * @return {number}
     */
    static #get_value(arr,context) {

        /**
         * 
         * @param {string[]} parent_list 
         * @param {string} context 
         * @return {SpokeHarmony[]}
         * finds the chain of harmonies from the list of parents to the context
         */
        function get_context_path(parent_list,context) {


        }
        
        let val = 0;
        for(let i = 0; i < arr.length; i++) {
            let obj = SpokeMaster.master.book.getObject(arr[i]);
            if (obj instanceof SpokeDot) {
                let context_value = 0;
                if (obj.parent_guids.length && !obj.parent_guids.includes(context ) ) {
                    let parent_guids = obj.parent;
                    let b_in_context = false;
                    while(parent_guids) {
                        let parent_obj = SpokeMaster.master.book.getObject(parent_guids);
                        if (parent_obj instanceof SpokeHarmony) {
                            context_value += parent_obj.value;
                            if (parent_obj.parent === context) {
                                b_in_context = true;
                                break;
                            }
                        } //end if parent is harmony
                    } //while going through the parent chain
                    if (!b_in_context) {
                        throw new Error(`dot has parent ${obj.parent} not in context ${context}`);
                    }
                } //end if object has parent not in this context 
                val += obj.value + context_value;
            } else if(obj instanceof SpokeHarmony) {
                val += obj.value
            }
        }
        
        return val;

        /*
        however, when getting the charge of a parent harmony, to calc the charge of combination,
            I think one or all of them are used at the same time? (I think its all)
            if its all, then all the parent hamonies must still be in the same context 
            */
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

     #splash() {
        let ret = [];
        /*
        todo: return array of all the top dots and  top harmony members
        randomize the array
        */
       return ret;
     }

     #rebuild() {
       let water = this.#splash() ;
       this.members = [];
       for(let i = 0; i < water.length; i++) {
         let thing = water[i];
         this.members.push(thing);
         let best_set = SpokeHarmony.#find_best_set(this.members,thing,this.guid);
         this.#maybe_create_add_harmony(best_set)
       }
     }

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
        if (this.members.includes(guid) || n.parent_guids.includes(this.guid)) {
            throw new Error(this.guid + " already has member of " + guid);
        }
        if (n instanceof SpokeDot || n instanceof SpokeHarmony) {
            n.add_parent(this.guid);
        } else {
            throw new Error(`the guid ${guid} is incorrect object when added to ${this.guid}`);
        }
        this.members.push(guid);
        let best_set = SpokeHarmony.#find_best_set(this.members,guid,this.guid);
        this.#maybe_create_add_harmony(best_set)
       

        /*
        todo:
          if any current member includes a parent of nested member, pick random one of those and this to add
          
        */
    }
}

class SpokeSimpleDraw {
    /**
     * @param {string} guid
     * @param {object} el
     */
    static draw(guid,el) {
        console.debug(guid,el);
        /*
        todo
        if el empty, make a top element
        if g a dot, add an empty div with charge in el, then return
        if g a harmony, add an empty div P, put the value of the harmony,add P to el, 
            for each member call draw with P
        */
    }
}

