// @ts-check
"use strict";

class SpokeActions {
    /**
     * @param {SpokeMember} member 
     */
    static delete_member_from_all_parents(member) {
        for (const parent_guid of member.parent_guids) {
            let parent = SpokeMaster.master.book.getObject(parent_guid);
            if (!(parent instanceof SpokeHarmony)) {
                continue;
            }
            parent.remove(member.guid);
        }
    }

    /**
     * @param {SpokeMember} member 
     * @return {string}
     */
    static get_export_string(member) {
        if (!(member instanceof SpokeHarmony)) {
            throw new Error("can only export harmonies");
        }
        let collection = SpokeHarmony.find_all_descendants(member.guid);
        return JSON.stringify(collection,null,2);
    }


     /**
     * 
     * @param {SpokeMember} member 
     * @param {SpokeMember}  future_parent
     */
    static add_member_to_parent(member,future_parent) {

        if (!(future_parent instanceof SpokeHarmony)) {
            return;
        }else {
            if (future_parent.parent_guids.length === 0 && (member instanceof SpokeHarmony)) {
                for (const member_guid of member.members) {
                    let thing = SpokeMaster.master.book.getObject(member_guid);
                    future_parent.add_member(thing.guid);
                }
            } else {
                future_parent.add(member.guid);
            }
            
        }
    }

    /**
     * @param {string} da_import 
     * @returns {SpokeMember}
     */
    static import_string(da_import) {
        let raw_collection = JSON.parse(da_import);
        let all_guids = Object.keys(raw_collection);
        for(const i of all_guids) {
            if (SpokeMaster.master.book.getObjectOrNull(i)) {
                throw new Error("guid already registered")
            }
        }
        let dots = {};
        let harms = {};
        let harm_order = [];
        for (const guid in raw_collection) {
            if (Object.hasOwnProperty.call(raw_collection, guid)) {
                const element = raw_collection[guid];
                if ('members' in element) {
                    harms[guid] = element;
                    harm_order.push(guid);
                } else if('dot_value' in element) {
                    dots[guid] = element;
                }
            }
        }
        for(const guid in dots) {
            let already = SpokeMaster.master.book.getObjectOrNull(guid);
            if (already) {continue;}
            new SpokeDot(dots[guid].dot_value,null,guid);
        }

        let first_guid = harm_order[0];
        /**
         * @type {?SpokeHarmony}
         */
        let first = null;
        for(const harm_guid of harm_order.reverse()) {
            let harm_object = harms[harm_guid];
            /**
             * @type {SpokeHarmony}
             */
            // @ts-ignore
            let da_harmony = SpokeMaster.master.book.getObjectOrNull(harm_guid);
            if (da_harmony && !(da_harmony instanceof SpokeHarmony)) {
                throw new Error("not a harmony already exists with same guid");
            }
            else if (da_harmony) {
                for (const member_guid of harm_object.members) {
                    da_harmony.add_member(member_guid);
                }
            } else {
                da_harmony = new SpokeHarmony(harm_object.members,null,harm_guid);
            }
            if (da_harmony.guid === first_guid) {
                first = da_harmony;
            }
        }
        if (! first ) {throw new Error("Could not find top of import");}    
        return first;

       
    }
    
}