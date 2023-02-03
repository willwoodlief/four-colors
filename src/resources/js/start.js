jQuery(function($) {
    SpokeMaster.master.init();

    $(`input.spoke-only-numberish`).on('input',function() {
        this.value = this.value.replace(/[^0-9 \,\-\+]/, '');
    });
    

    $(`.spoke-add-dot-to-top`).on('click',function() {
        let input = $(this).closest('.input-group').find('input');
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
            SpokeMaster.master.top_harmony.add(dot_b.guid);
        } else {
            let guid_array = [];
            for(let i = 0; i < values.length; i++) {
                let dot_b = new SpokeDot(values[i]);
                guid_array.push(dot_b.guid);
            }
            let me = new SpokeHarmony(guid_array);
            SpokeMaster.master.top_harmony.add(me.guid);
        }
        
        refresh_display();

    });

    function refresh_display() {
        let area = SpokeSimpleDraw.draw(SpokeMaster.master.top_harmony);
        let here = $(`#spoke-area`);
        here.find(`div`).remove();
        here.append(area);
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

});