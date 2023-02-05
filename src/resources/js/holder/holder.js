// @ts-check
"use strict";

class OneHolder {
    /**
     * @param {SpokeMember} thing 
     */
    static addSpokeToSelectedHolder(thing) {
        let selected_holder = OneHolder.getSelectedHolder();
        if (!selected_holder) {return;}
        selected_holder.data('guid',thing.guid).attr('data-guid',thing.guid);
        OneHolder.refreshHolder(selected_holder);
    }

    static getHolderArgNames() {
        let ret = [];
        $(`.spoke-arg-holder`).each(function(){
            ret.push($(this).data('holder_arg'));
        });
        return ret;

    }

    static getSelectedHolder() {
        let maybe = $(`.spoke-arg-holder.spoke-arg-holder-selected`);
        if (maybe.length) {
            return maybe;
        }
        return null;
    }

    /**
     * @param {string} holder_arg_name 
     * @return {JQuery}
     */
    static getHolder(holder_arg_name) {
        let holder = $(`.spoke-arg-holder[data-holder_arg="${holder_arg_name}"]`);
        return holder;
    }

    /**
     * @param {JQuery} holder 
     */
    static getMemberFromHolder(holder) {
      let guid = holder.data('guid');
      let thing = SpokeMaster.master.book.getObjectOrNull(guid);
      if (!thing) {return null; }
      return thing;
    }

     /**
     * @param {JQuery} holder 
     */
     static refreshHolder(holder) {
        let thing = OneHolder.getMemberFromHolder(holder);
        if (!thing) {
            OneHolder.clearHolder(holder);
            return;
        }
        holder.find(`.arg-guid`).text(thing.guid);
        holder.find(`.arg-value`).text(thing.value);
        let area = SpokeSimpleDraw.draw(thing);
        let here = holder.find(`.arg-display`);
        here.find(`div`).remove();
        here.append(area);
    }
    
   

    /**
     * @param {JQuery} holder 
     */
    static clearHolder(holder) {
        if (!holder.length) {return;}
        holder.find(`.arg-guid`).text('');
        holder.find(`.arg-value`).text('');
        holder.data('guid','').removeAttr('data-guid');
        let here = holder.find(`.arg-display`);
        here.find(`div`).remove();
        here.html('');
    }

    static refreshAllHolders() {
        let holder_names = OneHolder.getHolderArgNames();
        for(let i=0; i < holder_names.length; i++) {
            let name = holder_names[i];
            let holder = OneHolder.getHolder(name);
            OneHolder.refreshHolder(holder);
        }
    }

    /**
     * @param {JQuery} that 
     * @returns {?JQuery}
     */
    static getHolderFromElement(that) {
        let newly_selected_holder = null;
        if (that.hasClass('spoke-arg-holder')) {
            newly_selected_holder = that;
        } else {
            let maybe = that.closest('.spoke-arg-holder');
            if (maybe.length === 1 ) {
                newly_selected_holder = maybe;
            }
        }
        if (!newly_selected_holder) {
            console.warn('Did not find holder',this);
            return null;
        }
        return newly_selected_holder;
    }

    /**
     * @param {JQuery} holder 
     */
    static selectHolder(holder) {
        if (holder.hasClass('spoke-arg-holder-selected') ) {
            holder.removeClass(`spoke-arg-holder-selected`);
            OneHolder.clearHolder(holder);
         } else {
            $(`.spoke-arg-holder`).removeClass('spoke-arg-holder-selected');
            holder.addClass('spoke-arg-holder-selected')  ; 
         }
    }
}