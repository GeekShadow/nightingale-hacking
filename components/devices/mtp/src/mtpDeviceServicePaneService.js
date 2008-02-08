/**
//
// BEGIN SONGBIRD GPL
// 
// This file is part of the Songbird web player.
//
// Copyright(c) 2005-2008 POTI, Inc.
// http://songbirdnest.com
// 
// This file may be licensed under the terms of of the
// GNU General Public License Version 2 (the "GPL").
// 
// Software distributed under the License is distributed 
// on an "AS IS" basis, WITHOUT WARRANTY OF ANY KIND, either 
// express or implied. See the GPL for the specific language 
// governing rights and limitations.
//
// You should have received a copy of the GPL along with this 
// program. If not, go to http://www.gnu.org/licenses/gpl.html
// or write to the Free Software Foundation, Inc., 
// 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
// 
// END SONGBIRD GPL
//
 */

Components.utils.import("resource://app/components/sbProperties.jsm");
Components.utils.import("resource://app/components/sbLibraryUtils.jsm");
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

if (typeof(Cc) == "undefined")
  var Cc = Components.classes;
if (typeof(Ci) == "undefined")
  var Ci = Components.interfaces;
if (typeof(Cr) == "undefined")
  var Cr = Components.results;

const MTPNS = 'http://songbirdnest.com/rdf/servicepane/mtp-device#';

var mtpServicePaneServiceConfig = {
  className:      "Songbird MTP Device Support Module",
  cid:            Components.ID("{e0296079-a13a-4f5d-94c6-8d7a8f5c3c91}"),
  contractID:     "@songbirdnest.com/servicepane/mtpDevice;1",
  
  ifList: [ Ci.sbIServicePaneModule,
            Ci.nsIObserver ],
            
  categoryList:
  [
    {
      category: "service-pane",
      entry: "mtp-device"
    }
  ],

  devCatName:     "Media Transfer Protocol Device",

  devURNPrefix:   "urn:device:",
  libURNPrefix:   "urn:library:",
  itemURNPrefix:  "urn:item:",

  appQuitTopic:       "quit-application",

  devImgURL:      "chrome://songbird/skin/icons/icon-device.png",
  devBusyImgURL:  "chrome://songbird/skin/icons/icon-busy.png",
  devMgrURL:      "chrome://mtp/content/xul/mtpDeviceSummaryPage.xul",
};

function mtpServicePaneService() {

}

mtpServicePaneService.prototype.constructor = mtpServicePaneService;

mtpServicePaneService.prototype = {
  classDescription: mtpServicePaneServiceConfig.className,
  classID: mtpServicePaneServiceConfig.cid,
  contractID: mtpServicePaneServiceConfig.contractID,

  _cfg: mtpServicePaneServiceConfig,
  _xpcom_categories: mtpServicePaneServiceConfig.categoryList,
  
  _deviceManagerSvc:      null,
  _deviceServicePaneSvc:  null,
  _observerSvc:           null,
  _servicePaneSvc:        null,
  
  _sync_table: {},              // a table of the last sync states per deviceid
  _sync_listeners: [],          // a list of local listener objects to call back
  _watched_deviceId: null,      // the deviceId whose sync state is being watched

  // ************************************
  // sbIServicePaneService implementation
  // ************************************
  servicePaneInit: function mtpServicePaneService_servicePaneInit(aServicePaneService) {
    this._servicePaneSvc = aServicePaneService;
    this._initialize();
  },

  fillContextMenu: function mtpServicePaneService_fillContextMenu(aNode,
                                                                  aContextMenu,
                                                                  aParentWindow) {
    var mtpDeviceId = aNode.getAttributeNS(MTPNS, 'DeviceId');
    
    if ( /*1 ||*/ mtpDeviceId ) {
      var mtpDevice = this._getDeviceForId(mtpDeviceId);
      this._appendDeviceCommands(aContextMenu, mtpDevice, aParentWindow);
    }
  },

  fillNewItemMenu: function mtpServicePaneService_fillNewItemMenu(aNode,
                                                                  aContextMenu,
                                                                  aParentWindow) {
  },

  onSelectionChanged: function mtpServicePaneService_onSelectionChanged(aNode,
                                                          aContainer,
                                                          aParentWindow) {
  },

  canDrop: function mtpServicePaneService_canDrop(aNode, 
                                                  aDragSession, 
                                                  aOrientation, 
                                                  aWindow) {
    return false;
  },

  onDrop: function mtpServicePaneService_onDrop(aNode, 
                                                aDragSession, 
                                                aOrientation, 
                                                aWindow) {
  },

  onDragGesture: function mtpServicePaneService_onDragGesture(aNode, 
                                                              aTransferable) {
  },

  onRename: function mtpServicePaneService_onRename(aNode, 
                                                    aNewName) {
  },

  // ************************************
  // nsIObserver implementation
  // ************************************
  observe: function mtpServicePaneService_observe(aSubject, 
                                                  aTopic, 
                                                  aData) {
    switch (aTopic) {
      case this._cfg.appQuitTopic :
        this._shutdown();
      break;
    }

  },

  // ************************************
  // nsISupports implementation
  // ************************************
  QueryInterface: XPCOMUtils.generateQI(mtpServicePaneServiceConfig.ifList),
  
  // ************************************
  // Internal methods
  // ************************************
  _initialize: function mtpServicePaneService_initialize() {
    this._observerSvc = Cc["@mozilla.org/observer-service;1"]
                          .getService(Ci.nsIObserverService);
    
    this._observerSvc.addObserver(this, this._cfg.appQuitTopic, false);

    this._deviceServicePaneSvc = Cc["@songbirdnest.com/servicepane/device;1"]
                                   .getService(Ci.sbIDeviceServicePaneService);

    this._libServicePaneSvc = Cc["@songbirdnest.com/servicepane/library;1"]
                                .getService(Ci.sbILibraryServicePaneService);
                                
    this._deviceManagerSvc = Cc["@songbirdnest.com/Songbird/DeviceManager;2"]
                               .getService(Ci.sbIDeviceManager2);
    
    var deviceEventListener = {
      mtpDeviceServicePaneSvc: this,
      
      onDeviceEvent: function deviceEventListener_onDeviceEvent(aDeviceEvent) {
        dump(aDeviceEvent);
      }
    };
    
    this._deviceEventListener = deviceEventListener;
    this._deviceManagerSvc.addEventListener(deviceEventListener);

    var sbSvc = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService);
    this._stringBundle = sbSvc.createBundle("chrome://songbird/locale/songbird.properties");
  },
  
  _shutdown: function mtpServicePaneService_shutdown() {
    this._observerSvc.removeObserver(this, this._cfg.appQuitTopic);

    this._deviceManagerSvc.removeEventListener(this._deviceEventListener);
    this._deviceEventListener = null;
    
    this._deviceManagerSvc = null;
    this._deviceServicePaneSvc = null;
    this._libServicePaneSvc = null;
    this._observerSvc = null;
    this._stringBundle = null;
  },
  
  _processDeviceEvent: function mtpServicePaneService_processDeviceEvent(aDeviceEvent) {
    dump(aDeviceEvent);
    
    switch(aDeviceEvent.type) {
      case Ci.sbIDeviceEvent.EVENT_DEVICE_ADDED: {
        this._addDevice();
      }
      break;
      // maintain a table of sync states per deviceid, and call our local
      // listeners if the new state is for the deviceid being watched.
      case Ci.sbIDeviceEvent.EVENT_DEVICE_TRANSFER_START: // fallthru
      case Ci.sbIDeviceEvent.EVENT_DEVICE_TRANSFER_END: {
        var device = aDeviceEvent.origin;
        var deviceId = device.QueryInterface(Ci.sbIDevice).id;
        this._sync_table[deviceId] = 
          (aDeviceEvent.type == Ci.sbIDeviceEvent.EVENT_DEVICE_TRANSFER_START);
        this._callLocalSyncListeners(deviceId);
      }
      default:
    }
  },
  
  _addDevice: function mtpServicePaneService_addDevice() {
    dump("XXXAus: addDevice!!!\n\n");
  },
  
  _removeDevice: function mtpServicePaneService_removeDevice() {
  
  },
  
  _getDeviceForId: function mtpServicePaneService_getDeviceForId(aDeviceId) {
    // todo: return device whose id matches aDeviceId
    return { id: "fakeid" };
  },
  
  /**
   * Call our local listeners with the sync state for the deviceid 
   * that is currently being watched.
   * 
   */
  _callLocalSyncListeners: function 
    mtpServicePaneService_callLocalSyncListeners(aDeviceId) {
    // only call the listeners if the given deviceid is the one being watched
    if (aDeviceId == this._watched_deviceId) {
      // retrieve the last sync state for this deviceid
      var isSyncing = this._sync_table[aDeviceId];
      // if we do not have a sync state yet, it's because we haven't sync'ed
      // yet, so isSynching = false
      if (isSyncing == "undefined") 
        isSyncing = false;
      // call them all
      for (var i in this._sync_listeners) {
        var listener = this._sync_listeners[i];
        listener.onSyncStateChanged(isSyncing);
      }
    }
  },
  
  // ************************************
  // Context Commands
  // ************************************

  /**
   * Handles the "Get Info" context menu command for a device
   */
  _commandHandler_getDeviceInfo: function 
    mtpServicePaneService_commandHandler_getDeviceInfo(aDevice, aParentWindow) {
    // todo: show the info dialog for this device
    aParentWindow.alert("Get Device Info");
  },

  /**
   * Handles the "Rename Device" context menu command for a device
   */
  _commandHandler_renameDevice: function 
    mtpServicePaneService_commandHandler_renameDevice(aDevice, aParentWindow) {
    // todo: start node edition
    aParentWindow.alert("Begin Editing Device Name");
  },
  
  /**
   * Handles the "Eject Device" context menu command for a device
   */
  _commandHandler_ejectDevice: function 
    mtpServicePaneService_commandHandler_ejectDevice(aDevice, aParentWindow) {
    // todo: eject the device
    aParentWindow.alert("Eject Device");
  },
  
  /**
   * Handles the "Cancel Sync" context menu command for a device
   */
  _commandHandler_cancelDeviceSync: function 
    mtpServicePaneService_commandHandler_cancelDeviceSync(aDevice, aParentWindow) {
    // todo: cancel the device syncing
    aParentWindow.alert("Cancel Device Sync");
  },
  
  _command_handlers                    : [], // list of command handlers
  _stringBundle                        : null, // the songbird string bundle
  
  /**
   * Removes all command handlers registered on context menu commands
   */
  _removeCommandHandlers: function mtpServicePaneService_removeCommandHandlers() {
    while (this._command_handlers.length > 0) {
      var entry = this._command_handlers[0];
      var eventname = entry[0];
      var domnode = entry[1];
      var handler = entry[2];
      domnode.removeEventListener(eventname, handler);
      this._command_handlers.shift();
    }
  },
  
  /**
   * Appends all commands for a device node
   */
  _appendDeviceCommands: function 
    mtpServicePaneService_appendCommands(aContextMenu, 
                                         aDevice, 
                                         aParentWindow) {

    var service = this;
    
    // add a command to the context menu
    function addItem(id, label, accesskey, handler, disabled) {
      var menuitem = aContextMenu.ownerDocument.createElement('menuitem');
      menuitem.setAttribute('id', id);
      menuitem.setAttribute('class', 'menuitem-iconic');
      menuitem.setAttribute('label', label);
      if (accesskey) {
        menuitem.setAttribute('accesskey', accesskey);
      }
      if (handler) {
        service._command_handlers.push(["command", menuitem, handler]);
        menuitem.addEventListener("command", handler, false);
      }
      aContextMenu.appendChild(menuitem);
      if (disabled) {
        menuitem.setAttribute("disabled", "true");
      }
      return menuitem;
    };
    
    // add a separator to the context menu
    function addSeparator() {
      var separator = aContextMenu.ownerDocument.createElement('menuseparator');
      aContextMenu.appendChild(separator);
      return separator;
    };
    
    // creates a command handler that calls the specified method on the service
    function makeCommandHandler(handlerMethod) {
      var handler = {
        _service      : service, 
        _device       : aDevice,
        _parentWindow : aParentWindow,
        handleEvent   : function mtpServicePaneService_commandHandler( event ) {
          this._service[handlerMethod](this._device, this._parentWindow);
        }
      };
      return handler;
    };
    
    // add a listener to automatically update a context menu item's
    // attribute when the sync state changes for the device
    function addSyncListener(aDomNode, 
                              aAttribute, 
                              aValueWhenSyncing, 
                              aValueWhenNotSyncing) {
      var syncChangeListener = {
        _device      : aDevice,
        _node        : aDomNode,
        _attribute   : aAttribute,
        _syncvalue   : aValueWhenSyncing,
        _nosyncvalue : aValueWhenNotSyncing,
        onSyncStateChanged: function(aSyncing) {
          var val = aSyncing ? this._syncvalue : this._nosyncvalue;
          if (val)
            this._node.setAttribute(this._attribute, val);
          else
            this._node.removeAttribute(this._attribute);
        }
      };
      // add local listener
      service._sync_listeners.push(syncChangeListener);
    };

    // todo: change into real device descriptor
    var device_descriptor = "Device ID (XGB)";

    // "Device ID (XGB)"
    addItem('command_mtp_devicedescriptor', 
            device_descriptor, 
            null, 
            null,
            true);

    // "Get Info"
    addItem('command_mtp_getdeviceinfo', 
            this._localizeString('command.mtp.getdeviceinfo', "Get Info"), 
            this._localizeString('command.mtp.getdeviceinfo.accesskey', 'I'), 
            makeCommandHandler("_commandHandler_getDeviceInfo"));

    // "------------------"
    addSyncListener(addSeparator(), "hidden", null, "true");

    // "Cancel Sync"
    addSyncListener(addItem('command_mtp_canceldevicesync', 
                             this._localizeString('command.mtp.canceldevicesync',
                                                  'Cancel Sync'),
                             this._localizeString('command.mtp.canceldevicesync.accesskey',
                                                  'C'), 
                             makeCommandHandler("_commandHandler_cancelDeviceSync")),
                     "hidden",
                     null,
                     "true");

    // "------------------"
    addSeparator();

    // "Rename
    addItem('command_mtp_renamedevice', 
            this._localizeString('command.mtp.renamedevice', 'Rename'), 
            this._localizeString('command.mtp.renamedevice.accesskey', 'R'), 
            makeCommandHandler("_commandHandler_renameDevice"));

    // "------------------"
    addSeparator();

    // "Eject
    addSyncListener(addItem('command_mtp_ejectdevice', 
                           this._localizeString('command.mtp.ejectdevice', 
                                                'Eject'), 
                           this._localizeString('command.mtp.ejectdevice.accesskey',
                                                'E'),
                           makeCommandHandler("_commandHandler_ejectDevice")),
                     "disabled",
                     "true",
                     null);
    
    // remember that this is the device we are watching
    this._watched_deviceId = aDevice.id;
    this._callLocalSyncListeners(aDevice.id);
    
    // set up a listener for the popup hiding so we can clean up after ourselves               
    var popupHidingHandler = {
      _menu    : aContextMenu,
      _service : this,
      handleEvent : function mtpServicePaneService_popupHidingHandler( event ) {
        this._menu.removeEventListener("popuphiding", this, false);
        this._service._sync_listeners = [];
        this._watched_deviceId = null;
        this._service._removeCommandHandlers();
      }
    };
    aContextMenu.addEventListener("popuphiding", popupHidingHandler, false);
  },
  

  /**
   * Localize a string, with default
   */
  _localizeString: function mtpServicePaneService_localizeString(aString, 
                                                                 aDefault) {
    var localized = aDefault;
    try {
      localized = this._stringBundle.GetStringFromName(aString);
    } catch (e) {
      //Components.utils.reportError(e + " when trying to translate " + aString);
    }
    return localized;
  }
};


function NSGetModule(compMgr, fileSpec) {
  return XPCOMUtils.generateModule([mtpServicePaneService]);
}
