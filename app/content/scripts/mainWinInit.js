// JScript source code
/*
//
// BEGIN SONGBIRD GPL
// 
// This file is part of the Songbird web player.
//
// Copyright(c) 2005-2007 POTI, Inc.
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

//
// Mainwin Initialization
//

/**
 * \file mainWinInit.js
 * \brief Main window initialization functions and objects.
 * \internal
 */

var thePollPlaylistService = null;

var gServicePane = null;

//
// Module specific auto-init/deinit support
//
var mainWinInit = {};
mainWinInit.init_once = 0;
mainWinInit.deinit_once = 0;
mainWinInit.onLoad = function()
{
  if (mainWinInit.init_once++) { dump("WARNING: mainWinInit double init!!\n"); return; }
  SBInitialize();
}
mainWinInit.onUnload = function()
{
  if (mainWinInit.deinit_once++) { dump("WARNING: mainWinInit double deinit!!\n"); return; }
  window.removeEventListener("load", mainWinInit.onLoad, false);
  window.removeEventListener("unload", mainWinInit.onUnload, false);
  document.removeEventListener("sb-overlay-load", SBPostOverlayLoad, false);
  SBUninitialize();
}
window.addEventListener("load", mainWinInit.onLoad, false);
window.addEventListener("unload", mainWinInit.onUnload, false);
document.addEventListener("sb-overlay-load", SBPostOverlayLoad, false);



/**
 * \brief Initialize the main window.
 * \note Do not call more than once.
 * \internal
 */
function SBInitialize()
{

  try
  {
    //Whatever migration is required between version, this function takes care of it.
    SBMigrateDatabase();
  }
  catch(e) { }

  dump("SBInitialize *** \n");
  
  window.focus();

  try
  {
    onWindowLoadSizeAndPosition();
    
    // Set attributes on the Window element so we can use them in CSS.
    var platform = getPlatformString();    
    var windowElement = document.getElementsByTagName("window")[0]; 
    windowElement.setAttribute("platform", platform);

    // because the main window can change its minmax size from session to session (ie, long items in the service tree), 
    // we need to determine whether the loaded size is within the current minmax. If not, tweak the size by the difference
    /*
    var w = document.documentElement.boxObject.width;
    var h = document.documentElement.boxObject.height;
    var diffw = window.gOuterFrame.boxObject.width - window.innerWidth;
    var diffh = window.gOuterFrame.boxObject.height - window.innerHeight;
    // todo: see if that detects the situation
    dump("diffw = " + diffw + "\n");
    dump("diffh = " + diffh + "\n");
    // todo: resize the window accordingly (same method as windowUtils.js: 448 to 455)
    */
    setMinMaxCallback();


    initJumpToFileHotkey();

    if (window.addEventListener)
      window.addEventListener("keydown", checkAltF4, true);
      
    window.gServicePane.onPlaylistDefaultCommand = onServiceTreeCommand;
  }
  catch(err)
  {
    alert("mainWinInit.js - SBInitialize - " +  err);
  }
}

/**
 * \brief Uninitialize the main window.
 * \note Do not call more than once.
 * \internal
 */
function SBUninitialize()
{
  window.removeEventListener("keydown", checkAltF4, true);
  
  window.gServicePane = null;
  window.gBrowser = null;

  resetJumpToFileHotkey();
  closeJumpTo();
  try {
    var windowMinMax = Components.classes["@songbirdnest.com/Songbird/WindowMinMax;1"];
    if (windowMinMax) {
      var service = windowMinMax.getService(Components.interfaces.sbIWindowMinMax);
      if (service)
        service.resetCallback(document);
    }
  }
  catch(err) {
    dump("Error. songbird_hack.js: SBUnitialize() \n" + err + "\n");
  }

  thePollPlaylistService = null;
}

var SBWindowMinMaxCB = 
{
  // Shrink until the box doesn't match the window, then stop.
  GetMinWidth: function()
  {
    // What we'd like it to be
    var retval = 750;
    var outerframe = window.gOuterFrame;
    // However, if in resizing the window size is different from the document's box object
    if (window.innerWidth != outerframe.boxObject.width)
    { 
      // That means we found the document's min width.  Because you can't query it directly.
      retval = outerframe.boxObject.width - 1;
    }
    return retval;
  },

  GetMinHeight: function()
  {
    // What we'd like it to be
    var outerframe = window.gOuterFrame;
    var retval = 400;
    // However, if in resizing the window size is different from the document's box object
    if (window.innerHeight != outerframe.boxObject.height)
    { 
      // That means we found the document's min width.  Because you can't query it directly.
      outerframe = parent.boxObject.height - 1;
    }
    return retval;
  },

  GetMaxWidth: function()
  {
    return -1;
  },

  GetMaxHeight: function()
  {
    return -1;
  },

  OnWindowClose: function()
  {
    setTimeout(quitApp, 0);
  },

  QueryInterface : function(aIID)
  {
    if (!aIID.equals(Components.interfaces.sbIWindowMinMaxCallback) &&
        !aIID.equals(Components.interfaces.nsISupportsWeakReference) &&
        !aIID.equals(Components.interfaces.nsISupports)) 
    {
      throw Components.results.NS_ERROR_NO_INTERFACE;
    }
    
    return this;
  }
}; // SBWindowMinMax callback class definition

function setMinMaxCallback()
{
  try {
    var windowMinMax = Components.classes["@songbirdnest.com/Songbird/WindowMinMax;1"];
    if (windowMinMax) {
      var service = windowMinMax.getService(Components.interfaces.sbIWindowMinMax);
      if (service)
        service.setCallback(window, SBWindowMinMaxCB);
    }
  }
  catch (err) {
    // No component
    dump("Error. songbird_hack.js:setMinMaxCallback() \n " + err + "\n");
  }
}

function SBPostOverlayLoad()
{
  // After the overlays load, launch the scan for media loop if we haven't.
  var dataScan = SBDataGetBoolValue("firstrun.scancomplete");
  if (dataScan != true)
  {
    setTimeout( SBScanMedia, 1000 );
    SBDataSetBoolValue("firstrun.scancomplete", true);
  }
}
