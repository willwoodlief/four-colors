// @ts-check
"use strict";

//import MD5 from "../../../../node_modules/crypto-js/md5.js";
//console.log(MD5("Message").toString());

class SpokeMap {

    /**
     * @type {Object<string, SpokeMember|SpokeHarmony|SpokeDot>} book 
     */
    #book;
    constructor() {
        this.#book = {};
    }
    /**
     * 
     * @param {string} uuid 
     * @returns {SpokeHarmony|SpokeDot}
     */
    getObject(uuid) {
        let val =  this.#book[uuid]??null;
        if (!val) {
            if (!val) {throw new Error("Not object: " + uuid);}
        }
        if (val instanceof SpokeHarmony) {
            return val;
        }
        if (val instanceof SpokeDot) {
            return val;
        }

        throw new Error("Not a harmony or a dot: " + uuid);

    }

    /**
     * 
     * @param {string} uuid 
     */
    removeObject(uuid) {
        let ifthis = this.#book[uuid]??null;
        if (ifthis) {
            delete this.#book[uuid];
        }
    }

    /**
     * 
     * @param {string} uuid 
     * @returns {SpokeHarmony}
     */
    getHarmony(uuid) {
        let what = this.getObject(uuid);
        if (what instanceof SpokeHarmony) {
            return what;
        }
        throw new Error("Not a harmony: " + uuid);
    }

     /**
     * 
     * @param {string} uuid 
     * @returns {?SpokeHarmony|?SpokeDot}
     */
     getObjectOrNull(uuid) {
        try {
            return this.getObject(uuid);
        } catch(e) {
            return null 
        }
    }

    /**
     * 
     * @param {string} uuid 
     * @param {SpokeMember|SpokeHarmony|SpokeDot} obj 
     */
    addObject(uuid,obj) {
        this.#book[uuid] = obj;
    }
}

class SpokeChargeHashMap {
    /**
     * @type {Object<string, string[]>} book 
     */
    #charge_map;
    constructor() {
        this.#charge_map = {};
    }

    /**
     * @param {SpokeHarmony} harm 
     * @returns {object}
     */
    static #find_combined_charge_string(harm) {
        let my_charge = SpokeChargeHashMap.#calculateHash(harm);
        if (!my_charge) {throw new Error("could not get charge");}
        let parent_charge = null;
        let top_harm = SpokeChargeHashMap.#getTopLevelParent(harm);
        let top_harm_charge = SpokeChargeHashMap.#calculateHash(top_harm);
        if (top_harm?.guid??null !== harm.parent?.guid??null ) {
            parent_charge = SpokeChargeHashMap.#calculateHash(harm.parent);
        }
        let combined_hash = (top_harm_charge??'00') + '-' + (parent_charge??'00') + '-' + my_charge;
        
        return {charge: my_charge,combined_hash: combined_hash};
    }
    
    /**
     * @param {SpokeHarmony} harm 
     * @returns {string}
     */
    updateChargeMap(harm) {
        let what = SpokeChargeHashMap.#find_combined_charge_string(harm);
        let my_charge = what.charge;
        let combined_hash = what.combined_hash;

        if (!this.#charge_map[combined_hash]) { this.#charge_map[combined_hash] = [] ; }
        if (!this.#charge_map[combined_hash].includes(harm.guid)) {
            this.#charge_map[combined_hash].push(harm.guid);
        }
        
        return my_charge;
    }

    /**
     * @param {SpokeHarmony} harm 
     * @returns {string}
     */
    removeChargeMap(harm) {
        let what = SpokeChargeHashMap.#find_combined_charge_string(harm);
        let my_charge = what.charge;
        let combined_hash = what.combined_hash;
        if (this.#charge_map[combined_hash]) {
            let index = this.#charge_map[combined_hash].indexOf(harm.guid);
            if (index !== -1) {
                this.#charge_map[combined_hash].splice(index, 1);
            }
        }
        return my_charge;
    }
    
    /**
     * @param {SpokeHarmony} harm 
     * @param {object} [filter] //filter currently not implemented
     * @returns {SpokeHarmony[]}
     */
    findInChargeMap(harm,filter) {
        let what = SpokeChargeHashMap.#find_combined_charge_string(harm);
        let combined_hash = what.combined_hash;
        if (this.#charge_map[combined_hash]) {
            let members = [];
            for (const sibling_guid of this.#charge_map[combined_hash]) {
                members.push(SpokeMaster.master.book.getHarmony(sibling_guid));
            }
            return members
        } else {
            return [];
        }
    }

    /**
     * @param {?SpokeHarmony} harm 
     * @returns {?SpokeHarmony}
     */
    static #getTopLevelParent(harm) {
        
        let current = harm;
        let last_current = current;
        while(current) { 
            last_current = current;
            current = current.parent;
        }
        return last_current;
    }

    /**
     * @param {?SpokeHarmony} harm 
     * @returns {?string}
     */
    static #calculateHash(harm) {
        if (!harm) {return null;}
        let charge_string = '';
        let members = [];
        for (const member_guid of harm.members) {
            members.push(SpokeMaster.master.book.getObject(member_guid));
        }

        /**
        * 
        * @param {SpokeMember} a 
        * @param {SpokeMember} b
        * @returns {number} 
        */
        function compare_charge(a,b) {
            let dat_a = a.value;
            let dat_b = b.value;
            if (dat_a === dat_b) {
                return (((a.when_given_parent_mts??0) < (b.when_given_parent_mts??0)) ? 1 : -1);
            }
            return dat_a > dat_b ? 1 : -1;
        }
        members.sort(compare_charge);

        for (let i = 0; i < members.length;  i++) {
            let member = members[i];
            let spacer = (i * 256).toString();
            charge_string += spacer + '-' + member.value + '-';
        }

        let u = CryptoJS.SHA256(charge_string).toString();
        if (!u) {throw new Error("could not get the hash: " + charge_string);}
        return u;
    }

    
}

class SpokeMaster {
    static master;

    /**
     * @type {SpokeHarmony} top_harmony
     */
    top_harmony;


    /**
     * @type {Object<string, string[]>} attempts 
     */
    attempts;
   
    /**
     * @type {string[]} overflow 
     */
    overflow;


    constructor() {
        this.charge_map = new SpokeChargeHashMap();
        this.book = new SpokeMap();
        this.attempts = {};
        this.overflow = [];
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
     * @type {?string} parent_guid 
     */
    parent_guid;

    /**
     * @type {?number} when_given_parent_mts 
     */
    when_given_parent_mts;

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
    
        this.parent_guid = null;
        this.when_given_parent_mts = null;
        if (parent_guid) {
            this.parent_guid = parent_guid;
            this.parent = SpokeMaster.master.book.getHarmony(this.parent_guid);
        } 

        SpokeMaster.master.book.addObject(this.guid,this);

    }



     /**
     * @return {number}
     */
     get value() {
        return this.dot_value;
    }

     /**
     * @return {?SpokeHarmony}
     */
     get parent() {
        if(this.parent_guid) {
            return SpokeMaster.master.book.getHarmony(this.parent_guid);
        }
        return null;
    }

    /**
     * @param {?SpokeHarmony} some_parent
     */
    set parent(some_parent) {
        this.parent_guid = some_parent?.guid??null;
        this.when_given_parent_mts = Date.now();

        if (this instanceof SpokeHarmony) {
            if (this.parent_guid) {
                this.charge_hash = SpokeMaster.master.charge_map.updateChargeMap(this);
              } else {
                SpokeMaster.master.charge_map.removeChargeMap(this);
                this.charge_hash = null;
              }
        }
        

    }

    static minAllowedValue() { return -127; }
    static maxAllowedValue() { return 127; }


}


class SpokeDot extends SpokeMember{
    

    /**
     * @param {number} value 
     * @param {?string} [parent_guid]
     * @param {?string} [premade_own_guid]
     */
    constructor(value,parent_guid,premade_own_guid) {
        super(parent_guid,premade_own_guid);

        const some_value = parseInt(value.toString());
        if (SpokeMember.minAllowedValue() < some_value || SpokeMember.maxAllowedValue() > some_value) {
            throw new Error("value out of range: " + some_value);
        }
        this.dot_value = some_value;
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

