// @ts-check
"use strict";

jQuery(function($) {
    SpokeMaster.master.init();

    $(`input.spoke-only-numberish`).on('input',function() {
        // @ts-ignore
        this.value = this.value.replace(/[^0-9 \,\-\+]/, '');
    });
    

    $(`.spoke-add-dot-to-top`).on('click',function() {
        let input = $(this).closest('.input-group').find('input');
        // @ts-ignore
        let values = input.val()
            .toString()
            .split(/[ ,]+/)
            .map(e => e.trim())
            .filter( ( el ) => !isNaN(parseInt(el)) )
            .map(e => parseInt(e))
            ;
        if (values.length===0) {return;}
        if (values.length === 1) {
            let dot_b = new SpokeDot(values[0]);
            SpokeMaster.master.top_harmony?.add(dot_b.guid);
        } else {
            let guid_array = [];
            for(let i = 0; i < values.length; i++) {
                let dot_b = new SpokeDot(values[i]);
                guid_array.push(dot_b.guid);
            }
            let me = new SpokeHarmony(guid_array);
            SpokeMaster.master.top_harmony?.add(me.guid);
        }
        
        refresh_display();

    });



    

    $(document).on('click',`.spoke-arg-holder`,function() {
        let that = $(this);
        let holder = OneHolder.getHolderFromElement(that);
        if (holder) {
            OneHolder.selectHolder(holder);
        } else {
            console.warn('no holder found');
        }
        
    });

   
    $(document).on('click',`.spoke-action`,function(e) {
        e.stopPropagation();
        e.preventDefault();
        let thing = SpokeMaster.master.book.getObject($(this).data('guid'));
        OneHolder.addSpokeToSelectedHolder(thing);
    });

    function refresh_display() {
        let area = SpokeSimpleDraw.draw(SpokeMaster.master.top_harmony??null);
        let here = $(`#spoke-area`);
        here.find(`div`).remove();
        here.append(area);
        OneHolder.refreshAllHolders();
    }

    $(`button#onedot-playground-run-action`).on('click',function() {
        refresh_display();
    });

    $(`button#onedot-playground-clear-action`).on('click',function() {
        SpokeMaster.master.top_harmony.members = [];
        let here = $(`#spoke-area`);
        here.find(`div`).remove();
        here.html('');
    });
   
   
    $(`button#spoke-remove-action`).on('click',function() {
        let selected = OneHolder.getSelectedHolder();
        if (!selected) {return;}
        let member = OneHolder.getMemberFromHolder(selected);
        if (!member) {return;}
        SpokeActions.delete_member_from_all_parents(member);
        refresh_display();
    });
   
    $(`button#spoke-export-action`).on('click',function() {
        let selected = OneHolder.getSelectedHolder();
        if (!selected) {return;}
        let member = OneHolder.getMemberFromHolder(selected);
        if (!member) {return;}
        if (!(member instanceof SpokeHarmony)) {return;}
        let export_string = SpokeActions.get_export_string(member);
        $(`#onedot-collection`).text(export_string);
    });
   
   
    $(`button#spoke-import-action`).on('click',function() {
        let selected = OneHolder.getSelectedHolder();
        if (!selected) {return;}
        let import_string = $(`textarea#onedot-collection`).val();
        if (!import_string) {return;}
        // @ts-ignore
        let imported = SpokeActions.import_string(import_string); 

        OneHolder.addSpokeToSelectedHolder(imported);
        refresh_display();
    });

    $(`button#spoke-add-action`).on('click',function() {
        let selected = OneHolder.getSelectedHolder();
        if (!selected) {return;}
        let member = OneHolder.getMemberFromHolder(selected);
        if (!member) {return;}
        let holder_b = OneHolder.getHolder('b');
        let future_parent = OneHolder.getMemberFromHolder(holder_b);
        if (!future_parent) {return;}
        SpokeActions.add_member_to_parent(member,future_parent);
        refresh_display();
    });

});