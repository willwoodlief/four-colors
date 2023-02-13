// @ts-check
"use strict";

class SpokeHarmony extends SpokeMember {
    
    /**
    * @type {string[]} members 
    */
   members;


   /**
    * @type {?string} charge_hash 
    */
   charge_hash;
    

   
   /**
    * @param {string[]} members 
    * @param {?string} [parent_guid]
    * @param {?string} [premade_own_guid]
    */
   constructor(members,parent_guid,premade_own_guid) {
       super(parent_guid,premade_own_guid);
      
       if (!members) {members = [];}

       this.charge_hash = null;
       
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
    * @returns {boolean} //true if processed value
    */
   add_member(guid) {
       let child = SpokeMaster.master.book.getObject(guid);
       if (!this.members.includes(guid)) {
           this.members.push(guid);
       } else {
           return false;
       }
       child.parent = this;
       let best_set = SpokeHarmony.#find_best_set(this.members,this.guid);
       

       /**
        * finds if members can be added to new harmony, adds the members to harmony
        *  removes the members from this harmony 
        *  but does not add the new harmony to this
        * @returns {?SpokeHarmony}
        */
       function maybe_create_add_harmony() {
           if (!best_set || best_set.length === 0) {return null;}
           let equals_members = best_set.every((item)=>this.members.includes(item))
           if (equals_members && this.members.length === best_set.length) {return null;} //same child list, so its in general pop
           
           //remove set members from the top, do it first before adding
           const members_in_common = this.members.filter( ( el ) => best_set.includes( el ) );

           for(let k = 0; k < members_in_common.length; k++) {
               let guid_in_common = members_in_common[k];
               this.#remove_member(guid_in_common,true);
           }

           let nu = new SpokeHarmony(best_set,this.guid);
           return nu;
       }
       const bound_helper = maybe_create_add_harmony.bind(this);
       let maybe_new_sub = bound_helper();
       
       if (maybe_new_sub) {
           if (!this.members.includes(maybe_new_sub.guid)) {
               this.members.push(maybe_new_sub.guid);
           }
           maybe_new_sub.parent = this;
       }
       return this.#adjust_member_change_set_value();
   }

   /**
    * @param {string[]} arr
    * @param {string} focus 
    * @return {string[]} returns the guids of the best collection
    */
   static #find_best_set(arr,focus) {

       /**
        * 
        * @param {string[]} arr 
        * @param {string} keep 
        * @returns {string[][]}
        */
       function  subset_combination_keep(arr,keep) {
           const f = (/** @type {string | any[]} */ A, i=0) =>
               i === A.length ? [[]] : f(A, i+1).flatMap((/** @type {any} */ x) => [x, [A[i]].concat(x)]);
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

       let combos = subset_combination_keep(arr,focus);
      
       let min_val = 1000000;
       let ret = [];
       let focus_val = SpokeMaster.master.book.getHarmony(focus).value;
       for(let i = 0; i < combos.length; i++) {
           let da_combo = combos[i];
           let val = SpokeHarmony.#get_value(da_combo);
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
    * 
    * @returns {boolean}
    */
   #adjust_member_change_set_value() {
       const da_value =  SpokeHarmony.#get_value(this.members);
       
       if (SpokeMember.minAllowedValue() < da_value || SpokeMember.maxAllowedValue() > da_value) {
           let target_value;
           if (da_value < SpokeMember.minAllowedValue()) {
              target_value = SpokeMember.minAllowedValue();     
           } else if(da_value >  SpokeMember.maxAllowedValue() )  {
               target_value = SpokeMember.maxAllowedValue();
           } else {
               throw new Error('logic issue');
           }
           let members_to_remove = this.#find_members_to_adjust_value_to(target_value);
           for(let member_to_kick of members_to_remove) {
               this.#remove_member(member_to_kick.guid,true);
               
               /**
                * @param {SpokeMember} add_me_please 
                * @param {?SpokeHarmony} to_whome 
                */
               function add_again(add_me_please,to_whome) {
                   if(to_whome) {
                       let success = to_whome.#innerAdd(add_me_please.guid);
                       if (!success) {
                           add_again(add_me_please,to_whome.parent)
                       }
                   } else {
                       member_to_kick.parent = null;
                       if (!SpokeMaster.master.overflow.includes(member_to_kick.guid)) {
                           SpokeMaster.master.overflow.push[member_to_kick.guid]
                       } 
                   }
               } //end function 
               add_again(member_to_kick,this);
                      
           } //end for of 

           this.#rebuild();
           const new_value = SpokeHarmony.#get_value(this.members);
           this.dot_value = new_value;
           if (this.members.length === 0) {
               let parent = this.parent;
               if (parent) {
                   parent.remove(this.guid);
                   SpokeMaster.master.book.removeObject(this.guid);
               }
           }
           return true;
       } else {
           this.dot_value = da_value;
           return false;
       }
   }

   /**
    * 
    * @param {number} target_value 
    * @returns {SpokeMember[]}
    */
   #find_members_to_adjust_value_to(target_value) {
       
       /*
       go through all the members, order array of them to be either the largest values first or the smallest 
         based on taget being less than zero
         return first N where the current value minus thier sum is less than the target value
       */
       const current_value = this.value;
       let members_objects = [];
       for (const member_guid of this.members) {
            members_objects.push(SpokeMaster.master.book.getObject(member_guid));
        }

       //sort where the lowest absolute value is first
       members_objects.sort((a, b) => (Math.abs(a.value) > Math.abs(b.value) ) ?  1 : -1);

       if (target_value < 0) {
           if (current_value >= target_value) {return [];}
       } else {
           if (current_value <= target_value) {return [];}
       }

       
       let ret = [];
       let sum = current_value; 
       for(const some_member of members_objects) {
           
           
           if (target_value < 0) {
               if (some_member.value >= 0 ) { continue;}
           } else {
               if (some_member.value <= 0 ) { continue;}
           }
          
           sum += some_member.value;
           ret.push(some_member);

           if (target_value < 0) {
               if (current_value - sum >= target_value) {break;}
           } else {
               if (current_value - sum <= target_value) {break;}
           }
       }
       return ret;
   }

   /**
    * @param {string} guid 
    * @param {?boolean} [b_no_adjust] 
    * @returns {boolean} //true if processed value, false if no action
    */
   #remove_member(guid, b_no_adjust) {
       b_no_adjust= !! b_no_adjust;
       let index = this.members.indexOf(guid);
       if (index !== -1) {
           this.members.splice(index, 1);
       } else {
           throw new Error("Not a member: " + guid); 
       }

       let child = SpokeMaster.master.book.getObject(guid);
       child.parent= null;
       if (!b_no_adjust) {
           return this.#adjust_member_change_set_value();
       } else {
           return false;
       }
       
   }

   #clear_all_members() {
       for(let k = 0; k < this.members.length; k++) {
           let member_guid = this.members[k];
           this.#remove_member(member_guid,true);
       }
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
     return SpokeHarmony.#find_all_ancestors_or_descendants(some_guid,context,'parent',max_level);
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
   * @param {?string} some_guid
   * @param {?string} context
   * @param {string} search_type parent|members 
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
   if(! ['parent','members'].includes(search_type) ) {
       throw new Error("search type has to be 'parent','members'")
   }

   let some_obj = SpokeMaster.master.book.getObject(some_guid);
   
   /**
    * @type {Object<string,SpokeHarmonyDistance>} ret;
    */
   let ret = {};
   if (!context || context !== some_obj.guid) {
    ret[some_obj.guid] = new SpokeHarmonyDistance(some_obj,current_level);
   }
   if (search_type === 'parent' ) {
       if (!some_obj.parent) {return ret;}    
   } else {
       if (!some_obj[search_type]?.length) {return ret;}
   }
   

   ret[some_obj.guid] = new SpokeHarmonyDistance(some_obj,current_level); 

   if (search_type === 'parent' ) {
       let maybe_paths = SpokeHarmony.#find_all_ancestors_or_descendants(some_obj.parent_guid,context,search_type,max_level,current_level) ;
           Object.assign(ret,maybe_paths);
   } else {
       for(let i = 0; i < some_obj[search_type].length; i++) {
           let working_guid = some_obj[search_type][i];
           if (working_guid in ret) { continue;}
           let maybe_paths = SpokeHarmony.#find_all_ancestors_or_descendants(working_guid,context,search_type,max_level,current_level) ;
           Object.assign(ret,maybe_paths);
       } 
   }
   return ret;
   
}

 
   /**
    * @param {string[]} arr 
    * @return {number}
    */
   static #get_value(arr) {
       let val = 0;
       for(let i = 0; i < arr.length; i++) {
           let obj = SpokeMaster.master.book.getObject(arr[i]);
           val += obj.value;
       }
       
       return val;

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
      }
    }

    /**
     * 
     * @param {string} guid 
     */
    remove(guid) {
       this.#remove_member(guid,true);
       this.#rebuild();
    }

    /**
    * @param {string} guid 
    */
   add(guid) { 
       SpokeMaster.master.attempts[guid] =[];
       let new_parent = this.#innerAdd(guid);
       if (!new_parent) {
           SpokeMaster.master.attempts
       }
   }


   /**
    * @param {string} guid 
    * @returns {?SpokeHarmony}
    */
    #innerAdd(guid) {
       let n = SpokeMaster.master.book.getObject(guid);
      
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
           let some_siblings_array = SpokeMaster.master.charge_map.findInChargeMap(SpokeMaster.master.book.getHarmony(some_guid));
           for(const sibling_object of some_siblings_array) {
            nested[sibling_object.guid] = new SpokeHarmonyDistance(sibling_object,2);
           }
           
           
           let candidate_harmonies_guids = Object.keys(nested)
                                                   .filter(e=> (
                                                       (e !== my_guid )) &&
                                                       (nested[e].harmony instanceof SpokeHarmony) && 
                                                        ( !SpokeMaster.master.attempts[guid].includes(e) )
                                                   );
       
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

       if (!SpokeMaster.master.attempts[guid].includes(this.guid)) {
           finalists.push(new SpokeHarmonyDistance(this,0));
       }

       if( finalists.length === 0) {return null;}
       
       
       /**
        * 
        * @param {SpokeHarmonyDistance} a 
        * @return {number}
        */
       function calc_charge_distance(a) {
           //distance is non overlapping range for any value
           return Math.abs(a.harmony.value + n.value*256) + Math.abs(a.distance);    
       }

       /**
        * 
        * @param {SpokeHarmonyDistance} a 
        * @param {SpokeHarmonyDistance} b
        * @returns {number} 
        */
       function compare_charge_distance(a,b) {
            let dat_a = calc_charge_distance(a);
            let dat_b = calc_charge_distance(b);
            if (dat_a === dat_b) {
                return (((a.harmony.when_given_parent_mts??0) < (b.harmony.when_given_parent_mts??0)) ? 1 : -1);
            }
            return dat_a > dat_b ? 1 : -1;
       }

       //sort finalist array by how close to 0 each value to the new addition is
       //because only values that are opposite are considered, then  the smallest number will always closest to zero
       //if there is a tie, then we get the oldest one (when set to current parent) first
       finalists.sort(compare_charge_distance);

       let lowest_value = calc_charge_distance(finalists[0]);
       let ultra_finalist = finalists.filter(e=> (calc_charge_distance(e) === lowest_value ));
       //pick one of the lowest
       let winner = ultra_finalist[Math.floor(Math.random() * ultra_finalist.length)];
       if(SpokeMaster.master.attempts)
       SpokeMaster.master.attempts[n.guid].push(winner.harmony.guid);
       winner.harmony.add_member(n.guid);
       return winner.harmony;
    }
   

   /**
    * @return {JQuery}
    */
   draw() {
       return SpokeSimpleDraw.draw(this);
   }

  
}
