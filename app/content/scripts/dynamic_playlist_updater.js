/*
//
// BEGIN SONGBIRD GPL
// 
// This file is part of the Songbird web player.
//
// Copyright(c) 2006 POTI, Inc.
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
 
const PlaylistManager = new Components.Constructor("@songbirdnest.com/Songbird/PlaylistManager;1", "sbIPlaylistManager");
const PlaylistReaderManager = new Components.Constructor("@songbirdnest.com/Songbird/PlaylistReaderManager;1", "sbIPlaylistReaderManager");

var dpPlaylistManager = (new PlaylistManager()).QueryInterface(Components.interfaces.sbIPlaylistManager);
var dpPlaylistReaderManager = (new PlaylistReaderManager()).QueryInterface(Components.interfaces.sbIPlaylistReaderManager);

var dpCurrentTime = new Date();
var dpUpdaterCurrentRow = 0;
var dpUpdaterQuery = new sbIDatabaseQuery();
var dpUpdaterPlaylistQuery = new sbIDatabaseQuery();

var dpUpdaterPlaylistListener = null;

//Default to one minute update interval.
var dpUpdaterPeriod = 1;
var dpUpdaterInterval = null;

function DPUpdaterInit(interval)
{
  try
  {
    if(interval != 0)
      dpUpdaterPeriod = interval;

    setTimeout( DPUpdaterStart, 30 * 1000 ); // Don't do nothing for 30 seconds
    
    if(dpUpdaterQuery.isExecuting())
      return;
  }
  catch(err)
  {
    alert(err);
  }
}

function DPUpdaterDeinit()
{
}

function DPUpdaterStart()
{
  dpUpdaterInterval = setInterval( DPUpdaterRun, dpUpdaterPeriod * 100 * 60 ); // Then wake up every 6.
}

function DPUpdaterRun()
{
  try
  {
    // Sanity check
    if(dpUpdaterInterval == null)
      return;
    if(dpUpdaterQuery.isExecuting())
      return;
    
    if(dpUpdaterCurrentRow > 0 && dpUpdaterCurrentRow < dpUpdaterQuery.getResultObject().getRowCount())
    {
      //Next Row
      DPUpdaterUpdatePlaylist(dpUpdaterCurrentRow);
    }
    else
    {
      //Check to see if any dynamic playlists need to be updated.
      var nCount = dpPlaylistManager.getDynamicPlaylistsForUpdate(dpUpdaterQuery);
      
      if(nCount)
        DPUpdaterUpdatePlaylist(0);
    }
  }
  catch(err)
  {
    alert(err);
  }
}

function DPUpdaterUpdatePlaylist(row)
{
  try
  {
    var resObj = dpUpdaterQuery.getResultObject();
    var rowCount = resObj.getRowCount();

    var strGUID = resObj.getRowCellByColumn(row, "service_uuid");
    var strURL = resObj.getRowCellByColumn(row, "url");
    var strName = resObj.getRowCellByColumn(row, "name");
    var strReadableName = resObj.getRowCellByColumn(row, "readable_name");

    // Allow tracks with the same filename to be added to this type of
    // playlist, see bug 1635
    var success = dpPlaylistReaderManager.loadPlaylist(strURL, strGUID, strName, strReadableName, "user", strURL, "", false, null);
   
    if(success)
    {
      dpUpdaterPlaylistQuery.resetQuery();
      dpUpdaterPlaylistQuery.setDatabaseGUID(strGUID);
      dpPlaylistManager.setDynamicPlaylistLastUpdate(strName, dpUpdaterPlaylistQuery);
    }
    
    dpUpdaterCurrentRow++;
  
    if(dpUpdaterCurrentRow >= rowCount)
      dpUpdaterCurrentRow = 0;
  }
  catch(err)
  {
    alert(err);
  }
}

function DPUpdaterManualRun()
{
  var nCount = dpPlaylistManager.getDynamicPlaylistsForUpdate(dpUpdaterQuery);
  
  if(nCount)
    DPUpdaterUpdatePlaylist(0);
}