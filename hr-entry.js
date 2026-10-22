// Payroll uses the existing FieldOps login. No second session or demo fallback.
(function(root){
  'use strict';
  var OWNER='1ac2392a-b490-4cc5-9579-0cb1bc9e3eb1';
  function canOpen(u){return !!(u&&u.org_id===OWNER&&(u.is_super||(u.allowed_pages||[]).some(function(p){return p==='payroll'||p==='hrvalidate';})));}
  function create(modules){
    var mounted=null, identity=null, opening=null, generation=0;
    function reset(){generation++;if(mounted)mounted.destroy();mounted=null;identity=null;opening=null;}
    function open(el,o){
      if(!canOpen(o.user)){reset();el.textContent='Payroll is available to authorized AHBA GC staff only.';return Promise.resolve();}
      var key=o.user.username+'|'+o.user.org_id+'|'+JSON.stringify([o.user.is_super,o.user.allowed_pages,o.user.edit_pages]);
      if(identity===key&&(mounted||opening))return opening||Promise.resolve(mounted);
      reset();identity=key;var epoch=generation;
      if(!o.client||!modules.api||!modules.console){el.textContent='Payroll could not load. Please reload this page.';return Promise.resolve();}
      el.textContent='Loading payroll…';
      var api=modules.api.create(o.client);
      opening=api.me().then(function(me){
        if(!me||(!me.is_admin&&!me.is_validator))throw new Error('Your account does not have Payroll access.');
        return api.integrationCapabilities();
      }).then(function(){
        if(epoch!==generation)return;
        var edits=o.user.edit_pages||[];
        mounted=modules.console.mount(el,{api:api,user:o.user,deps:{toast:o.toast,ensureXLSX:o.ensureXLSX,ensureXLSXStyle:o.ensureXLSXStyle,canEdit:!!(o.user.is_super||edits.indexOf('payroll')>=0||edits.indexOf('hrvalidate')>=0)}});
        return mounted;
      }).catch(function(e){
        if(epoch!==generation)return;
        el.textContent=['PGRST106','PGRST202'].indexOf(e.code)>=0?'Payroll is not yet available on this server. Your other FieldOps pages are ready to use.':'Payroll could not load: '+e.message;
        identity=null;
      }).finally(function(){if(epoch===generation)opening=null;});
      return opening;
    }
    return{open:open,reset:reset};
  }
  root.FieldOpsHR={canOpen:canOpen,create:create};
})(typeof window!=='undefined'?window:globalThis);
