if (typeof(Cc) == "undefined")
	var Cc = Components.classes;
if (typeof(Ci) == "undefined")
	var Ci = Components.interfaces;
if (typeof(Cu) == "undefined")
	var Cu = Components.utils;

if (typeof(RADIO_ICON_SMALL) == "undefined")
	var RADIO_ICON_SMALL = "chrome://sb-lastfm/skin/icon_radio_small.png";
if (typeof(GLOBE_ICON) == "undefined")
	var GLOBE_ICON = "chrome://sb-lastfm/skin/homepage.png";
if (typeof(LASTFM_ICON) == "undefined")
	var LASTFM_ICON = "chrome://sb-lastfm/skin/as.png";
if (typeof(htmlns) == "undefined")
	var htmlns = "http://www.w3.org/1999/xhtml";

if (typeof(DISPLAY_SEARCH_LIMIT) == "undefined")
	var DISPLAY_SEARCH_LIMIT = 16;
if (typeof(DISPLAY_RECENT_STATIONS_LIMIT) == "undefined")
	var DISPLAY_RECENT_STATIONS_LIMIT = 10;
if (typeof(DISPLAY_RELATED_TAGS_LIMIT) == "undefined")
	var DISPLAY_RELATED_TAGS_LIMIT = 6;
if (typeof(DISPLAY_RELATED_ARTISTS_LIMIT) == "undefined")
	var DISPLAY_RELATED_ARTISTS_LIMIT = 6;
if (typeof(DISPLAY_TOP_FANS_LIMIT) == "undefined")
	var DISPLAY_TOP_FANS_LIMIT = 6;
if (typeof(LIMIT_NAV_RESULTS) == "undefined")
	var LIMIT_NAV_RESULTS = 10;

if (typeof(LibraryUtils) == "undefined")
	Cu.import("resource://app/jsmodules/sbLibraryUtils.jsm");
if (typeof(SBProperties) == "undefined")
	Cu.import("resource://app/jsmodules/sbProperties.jsm");
	
if (typeof(gBrowser) == "undefined")
	var gBrowser = Components.classes['@mozilla.org/appshell/window-mediator;1']
		.getService(Components.interfaces.nsIWindowMediator)
		.getMostRecentWindow('Songbird:Main').gBrowser;

var LastfmTuner = {
	// Default to artist search
	searchType: "artist",

	init: function() {
		// Create our string bundle
		LastfmTuner._strings = Cc["@mozilla.org/intl/stringbundle;1"]
			.getService(Ci.nsIStringBundleService)
			.createBundle("chrome://sb-lastfm/locale/overlay.properties");

		// Add a pointer to our service
		LastfmTuner.svc = Cc['@songbirdnest.com/lastfm;1']
			.getService().wrappedJSObject;

		// And a pointer to nsIJSON
		LastfmTuner.jsonSvc = Cc["@mozilla.org/dom/json;1"]
                 .createInstance(Ci.nsIJSON);

		// Add our listeners for login/logout state change
		LastfmTuner.svc.listeners.add(LastfmTuner);

		LastfmTuner.populateBox("nav-recent-stations",
				LastfmTuner.dataRecentStations);

		// Add a preferences observer
		LastfmTuner.prefs = Cc["@mozilla.org/preferences-service;1"]
			.getService(Ci.nsIPrefService).getBranch("extensions.lastfm.")
			.QueryInterface(Ci.nsIPrefBranch2);
		LastfmTuner.prefs.addObserver("", LastfmTuner, false);

		// populate the Songbird boxes
		LastfmTuner.populateBox("nav-played-artists-sb",
				LastfmTuner.dataSBMostPlayedArtists);
		LastfmTuner.populateBox("nav-rated-artists-sb",
				LastfmTuner.dataSBHighestRatedArtists);
		LastfmTuner.populateBox("nav-genres-sb",
				LastfmTuner.dataSBGenres);
		
		// Set up the header display
		LastfmTuner.setHeaderDisplay();
		$("#lastfm-header-style").click(function(e) {
			e.preventDefault();
			e.stopPropagation();
			LastfmTuner.toggleHeaderDisplay();
		});

	},

	fini: function() {
		LastfmTuner.svc.listeners.remove(LastfmTuner);
		LastfmTuner.prefs.removeObserver("", LastfmTuner, false);
	},

	// sbILastFm listeners for events generated by the service
	onAuthorisationSuccess: function() {
	},
	onLoginSucceeded: function() {
		dump("login success hook called: " + LastfmTuner.svc.subscriber + "\n");
		LastfmTuner.populateBox("nav-recommended-artists", this.dataRecArtists);
		LastfmTuner.populateBox("nav-top-artists", this.dataTopArtists);
		LastfmTuner.populateBox("nav-top-tags", this.dataTopTags);
		LastfmTuner.populateBox("nav-friends", this.dataMyFriends, 999);
		LastfmTuner.populateBox("nav-neighbours", this.dataMyNeighbours);

		// expose the last.fm stations
		$("#right-nav-last-fm").slideDown("slow");

		if (LastfmTuner.svc.subscriber) {
			$("#subscriber-page").hide();
		}
	},
	onLoginFailed: function() {
	},
	onProfileUpdated: function() {
		// Set the profile image
		var avatar = "chrome://sb-lastfm/skin/default-avatar.png";
		if (LastfmTuner.svc.avatar)
			avatar = LastfmTuner.svc.avatar;
		var imageEl = document.getElementById("lastfm-user-image");
		imageEl.src = avatar;
		imageEl.onload = function() {
			$("#user-profile").fadeIn("slow");
		}

		var name = LastfmTuner.svc.realname;
		LastfmTuner.profileurl = LastfmTuner.svc.profileurl;

		// Set the username
		$("#lastfm-user-name").empty();
		$("#lastfm-user-name").append(name);

		// Fixup the links for the personal stations
		var username = LastfmTuner.svc.username;
		$("#nav-user-stations-results a").each(function() {
			this.href = "lastfm://user/" + username + "/" + this.id;
		});

		// Show the personal stations
		//$("#lastfm-user-stations").fadeIn("slow");
			
		// if logged in, hide the login lightbox
		$("#login-page").hide();
		if (!LastfmTuner.svc.subscriber)
			$("#subscriber-page").show();
	},
	onLoveBan: function() {
	},
	onShouldScrobbleChanged: function() {
	},
	onUserLoggedOutChanged: function() {
		// make the user info stuff go away
		$("#user-profile").fadeOut("slow");
		$("#lastfm-user-stations").fadeOut("slow");

		// hide the last.fm stations
		$("#right-nav-last-fm").slideUp("slow");
		
		// if not logged in, show the login lightbox
		$("#login-page").show();
		$("#subscriber-page").hide();
	},
	showLogin: function() {
		Cc['@mozilla.org/appshell/window-mediator;1']
			.getService(Ci.nsIWindowMediator)
			.getMostRecentWindow('Songbird:Main').LastFm.showPanel();
	},
	onLoggedInStateChanged: function() {
	},
	onErrorChanged: function() {
	},
	onLoginBegins: function() {
	},
	onLoginCancelled: function() {
	},

	/*
	 * Search routines
	 */

	collectResults: function(success, xml, type, limit) {
		if (!success) {
			dump("Failed search\n");
			return null;
		}
		var tagResults = xml.getElementsByTagName(type);
		if (tagResults.length == 0) {
			dump("No results found\n");
			return null;
		}

		function xmlText (node, tag, attr, value) {
			var tags = node.getElementsByTagName(tag);
			if (tags.length) {
				if (!attr) 
					return tags[0].textContent;
				else {
					for (var i=0; i<tags.length; i++) {
						if (tags[i].getAttribute(attr) == value) {
							return tags[i].textContent;
						}
					}
					return tags[0].textContent;
				}
			} else {
				return "";
			}
		}
		
		var results = new Array();
		for (var i=0; i<tagResults.length; i++) {
			var tagResult = tagResults[i];
			var notStreamable = (xmlText(tagResult, 'streamable') == "0");
			if (notStreamable) {
				continue;
			}

			var info = {
				name: xmlText(tagResult, 'name')
							.replace(/&/g, "&amp;").replace(/>/g, "gt;")
							.replace(/</g, "&lt;").replace(/"/g, "&quot;"),
				url: xmlText(tagResult, 'url'),
				type: type
			}
			var pattern, replace;
			switch (type) {
				case "artist":
					pattern = /^.*www\.last\.fm\/music/;
					replace = "lastfm://artist";
					info.sImageUrl = xmlText(tagResult,
							'image', "size", "small");
					info.mImageUrl = xmlText(tagResult,
							'image', "size", "medium");
					info.lImageUrl = xmlText(tagResult,
							'image', "size", "large");
					break;
				case "tag":
					pattern = /^.*www\.last\.fm\/tag/;
					replace = "lastfm://tag";
					info.sImageUrl = "chrome://sb-lastfm/skin/tag.png";
					info.mImageUrl = "chrome://sb-lastfm/skin/tag_m.png";
					info.lImageUrl = "chrome://sb-lastfm/skin/tag_l.png";
					break;
				case "user":
					pattern = /^.*www\.last\.fm\/user/;
					replace = "lastfm://user";
					info.sImageUrl = xmlText(tagResult,
							'image', "size", "small");
					info.mImageUrl = xmlText(tagResult,
							'image', "size", "medium");
					info.lImageUrl = xmlText(tagResult,
							'image', "size", "large");
					break;
				default: break;
			}

			if (!info.sImageUrl)
				info.sImageUrl = "http://cdn.last.fm/flatness/catalogue/noimage/2/default_user_small.png";
			if (!info.mImageUrl)
				info.mImageUrl = "http://cdn.last.fm/flatness/catalogue/noimage/2/default_user_medium.png";
			if (!info.lImageUrl)
				info.lImageUrl = "http://cdn.last.fm/flatness/catalogue/noimage/2/default_user_large.png";
			info.stationUrl = info.url.replace(pattern, replace);
			results.push(info);

			// if we have enough results, then stop
			if (limit && results.length >= limit)
				break;
		}
		return results;
	},

	runSearch: function() {
		var search = $('#search-box')[0].value;

		// Make the search button "busy", and clear the results area
		var e = $('#explorer');
		e.empty();

		e.append("<div id='artist-results' /><div id='tag-results' />");

		// Get the artist results
		LastfmTuner.svc.apiCall("artist.search", {artist:search},
				function response(success, xml)
		{
			var results = LastfmTuner.collectResults(success, xml, "artist",
				DISPLAY_SEARCH_LIMIT);

			var ar = $("#artist-results", e);
			if (!results) {
				var str = LastfmTuner._strings.formatStringFromName(
					"lastfm.radio.no_artists_found", [search], 1);
				ar.append("<h2 class='title'>" + str + "</h2>");
				$(window).resize();
				return;
			}

			var artistsHeader = LastfmTuner._strings.GetStringFromName(
				"lastfm.radio.artists");
			ar.append("<h2 class='title'>" + artistsHeader + "</h2>");
			LastfmTuner.drawMultipleResults(results, "artist", "l", 9, ar,
				function(station) {
					LastfmTuner.drawSingleArtist(station.stationInfo);
			});
			$(window).resize();
		});
		LastfmTuner.svc.apiCall("tag.search", {tag:search},
				function response(success, xml)
		{
			var results = LastfmTuner.collectResults(success, xml, "tag",
				DISPLAY_SEARCH_LIMIT);

			var tr = $("#tag-results", e);
			if (!results) {
				var str = LastfmTuner._strings.formatStringFromName(
					"lastfm.radio.no_tags_found", [search], 1);
				tr.append("<h2 class='title'>" + str + "</h2>");
				$(window).resize();
				return;
			}

			var tagsHeader = LastfmTuner._strings.GetStringFromName(
				"lastfm.radio.tags");
			tr.append("<h2 class='title'>" + tagsHeader + "</h2>");
			LastfmTuner.drawMultipleResults(results, "tag", "s", 9, tr,
				function(station) {
					LastfmTuner.drawSingleTag(station.stationInfo);
			});
			$(window).resize();
		});
	},

	drawMultipleResults: function(results, type, imgSize, limit, node, onclick)
	{
		var resultClass = type + "-result";
		var imageClass = type + "-image";
		node.append("<div class='search-results'>");
		results.forEach(function(val, i, arr) {
			if (i >= limit)
				return;
			var singleResult;
			var image = val[imgSize + "ImageUrl"];
			if (type == "tag") {
				var playStr = LastfmTuner._strings.GetStringFromName(
					"lastfm.radio.play");
				singleResult = $(
					"<div class='single-result " + resultClass + "'>" +
					
					"<div class='station-info'>" +
						"<div class='station-name'>" +
							"<img class='" + imageClass + "' src='" + image +
							"'/>" + val.name +
						"</div>" +

					"<div class='station-nav'>" +
						"<div class='station-play'><a href='" + val.stationUrl +
						"'><img src='" + RADIO_ICON_SMALL + 
						"'/>" + playStr + "</a></div>" +	//station-play
						"<div class='station-web'>" +
							"<img height='12' src='" + GLOBE_ICON + "'/>" +
						"</div>" +
					"</div>" +	//station-nav
					"</div>" +  //station-info

					"</div>");

					var nav = $(".station-nav", singleResult);
					nav.hide();
					singleResult.hover(function over(e) {
						var p = $(e.target).position();
						var x = p.left + 60;
						var y = p.top;
						nav.css({'left': x, 'top': y});
						nav.fadeIn('fast');
					}, function out(e) {
						nav.hide();
					});
			} else {
				var playStr = LastfmTuner._strings.GetStringFromName(
					"lastfm.radio.play");
				singleResult = $(
					"<div class='single-result " + resultClass + "'>" +
			
					// the artist image
					"<div class='img-outer-shadow-bottom'><div class='img-outer-shadow'><div class='img-outer'><div class='img-inner'>" +
					"<img src='" + image + "' height='80' border='0' />" +
					"</div></div></div></div>" +

					"<div class='station-info'>" + val.name +
					"<div class='station-nav'>" +
						"<div class='station-play'><a href='" + val.stationUrl +
						"'><img src='" + RADIO_ICON_SMALL + 
						"'/>" + playStr + "</a></div>" +	//station-play
						"<div class='station-web'>" +
							"<img height='12' src='" + GLOBE_ICON + "'/>" +
						"</div>" +
					"</div>" +	//station-nav
					"</div>" +  //station-info
					
					"</div>");

				$(".station-nav", singleResult).hide();
				singleResult.hover(function over(e) {
					$(".station-nav", this).fadeIn('normal');
				}, function out(e) {
					$(".station-nav", this).fadeOut(100);
				});
			}
			$('.search-results', node).append(singleResult);

			$('.station-play', singleResult).click(function(e) {
				e.stopPropagation();
				e.preventDefault();
				LastfmTuner.saveRecentStation(val);
				LastfmTuner.svc.radioPlay(val.stationUrl);
			});
			$('.station-web', singleResult).click(function(e) {
				e.stopPropagation();
				e.preventDefault();
				gBrowser.loadOneTab(val.url);
			});
			
			singleResult.stationInfo = val;
			singleResult.click(function(e) {
				e.stopPropagation();
				e.preventDefault();
				onclick(singleResult);
			});
		});
	},

	createDetailBlock: function(info, type) {
		var playStr = LastfmTuner._strings.GetStringFromName(
			"lastfm.radio.play");
		var block = $("<div class='detail-view detail-view-" + type + "'>" +
			"<img class='" + type + "-image' src='" + info.lImageUrl + "'/>" +
			"<div class='detail-info-" + type + "'><h3>" + info.name + "</h3>" +
				"<div class='detail-info-homepage'><a href=''>" +
					"<img src='" + GLOBE_ICON + "'/>View station page" +
					"</a></div>" +
				"<div class='station-play-button'><a href='" + info.stationUrl +
					"'><img src='" + RADIO_ICON_SMALL + "'/>" +
					playStr + "</a></div>"
			+ "</div></div>");

		$(".station-play-button", block).click(function(e) {
			e.stopPropagation();
			e.preventDefault();
			LastfmTuner.saveRecentStation(info);
			LastfmTuner.svc.radioPlay(info.stationUrl);
		});
		$(".detail-info-homepage", block).click(function(e) {
			e.stopPropagation();
			e.preventDefault();
			gBrowser.loadOneTab(info.url);
		});

		if (!info.lImageUrl) {
			LastfmTuner.svc.apiCall('artist.getInfo', {
				limit: 20,
				artist: info.name,
			}, function response(success, xml) {
				var results = LastfmTuner.collectResults(success, xml,
					"artist", 1);
				if (results == null) {
					dump("artist.getInfo failed\n");
					return;
				}
				dump("setting image to: " + results[0].lImageUrl + "\n");
				$("img." + type + "-image", block)[0].src =
						results[0].lImageUrl;
			});
		}

		return block;
	},

	drawSingleArtist: function(info) {
		var artistDetail = LastfmTuner._strings.GetStringFromName(
			"lastfm.radio.artist.detail");
		$('#explorer').empty();
		$('#explorer').append("<h2 class='title'>" + artistDetail + "</h2>");

		// we got passed a station object, wrap it into a jQuery element
		// and render it
		var detailBlock = LastfmTuner.createDetailBlock(info, "artist");
		$('#explorer').append(detailBlock);
		$('#explorer').append("<div style='clear:left;' />");

		$('#explorer').append("<div id='tags'>");
		var tagsDiv = $('#explorer > #tags');
		tagsDiv.hide();
		$('#explorer').append("<div id='artists'>");
		var artistsDiv = $('#explorer > #artists');
		artistsDiv.hide();
		$('#explorer').append("<div id='fans'>");
		var fansDiv = $('#explorer > #fans');
		fansDiv.hide();

		var tagsStr = LastfmTuner._strings.GetStringFromName(
			"lastfm.radio.artist.tags");
		tagsDiv.append("<h3 class='subtitle'>" + tagsStr + "</h3>");
		tagsDiv.append("<div class='results'>");

		var similarStr = LastfmTuner._strings.GetStringFromName(
			"lastfm.radio.similar.artists");
		artistsDiv.append("<h3 class='subtitle'>" + similarStr + "</h3>");
		artistsDiv.append("<div class='results'>");

		var fansStr = LastfmTuner._strings.GetStringFromName(
			"lastfm.radio.fans");
		fansDiv.append("<h3 class='subtitle'>" + fansStr + "</h3>");
		fansDiv.append("<div class='results'>");

		LastfmTuner.svc.apiCall('artist.gettoptags', {
			limit: 20,
			artist: info.name,
		}, function response(success, xml) {
			var results = LastfmTuner.collectResults(success, xml, "tag",
				DISPLAY_RELATED_TAGS_LIMIT);
			if (results == null) {
				dump("collect artist top tags failed\n");
				return;
			}
			LastfmTuner.drawMultipleResults(results, "tag", "s", 9,
				$('.results', tagsDiv), function(station) {
						LastfmTuner.drawSingleTag(station.stationInfo);
					});
			tagsDiv.append("<div style='clear:left;' />");
			tagsDiv.fadeIn('slow');
			$(window).resize();
		});
		
		LastfmTuner.svc.apiCall('artist.getsimilar', {
			limit: 20,
			artist: info.name,
		}, function response(success, xml) {
			var results = LastfmTuner.collectResults(success, xml, "artist",
				DISPLAY_RELATED_ARTISTS_LIMIT);
			if (results == null) {
				dump("collect artist similar artists failed\n");
				return;
			}
			LastfmTuner.drawMultipleResults(results, "artist", "l", 9,
				$('.results', artistsDiv), function(station) {
					LastfmTuner.drawSingleArtist(station.stationInfo);
			});
			artistsDiv.append("<div style='clear:left;' />");
			artistsDiv.fadeIn('slow');
			$(window).resize();
		});

		LastfmTuner.svc.apiCall('artist.getTopFans', {
			limit: 20,
			artist: info.name,
		}, function response(success, xml) {
			var results = LastfmTuner.collectResults(success, xml, "user",
				DISPLAY_TOP_FANS_LIMIT);
			if (results == null) {
				dump("collect artist top fans failed\n");
				return;
			}
			LastfmTuner.drawMultipleResults(results, "artist", "l", 9,
				$('.results', fansDiv), function(station) {
						LastfmTuner.drawSingleUser(station.stationInfo);
					});
			fansDiv.append("<div style='clear:left;' />");
			fansDiv.fadeIn('slow');
			$(window).resize();
		});
	},
	
	drawSingleTag: function(info) {
		var tagDetail = LastfmTuner._strings.GetStringFromName(
			"lastfm.radio.tag.detail");
		$('#explorer').empty();
		$('#explorer').append("<h2 class='title'>" + tagDetail + "</h2>");
		
		var detailBlock = LastfmTuner.createDetailBlock(info, "tag");
		$('#explorer').append(detailBlock);
		
		$('#explorer').append("<div style='clear:left;' />");

		$('#explorer').append("<div id='tags'>");
		var tagsDiv = $('#explorer > #tags');
		tagsDiv.hide();
		$('#explorer').append("<div id='artists'>");
		var artistsDiv = $('#explorer > #artists');
		artistsDiv.hide();

		var similarTags = LastfmTuner._strings.GetStringFromName(
			"lastfm.radio.similar.tags");
		tagsDiv.append("<h3 class='subtitle'>" + similarTags + "</h3>");
		tagsDiv.append("<div class='results'>");

		var tagArtists = LastfmTuner._strings.GetStringFromName(
			"lastfm.radio.tag.artists");
		artistsDiv.append("<h3 class='subtitle'>" + tagArtists + "</h3>");
		artistsDiv.append("<div class='results'>");

		LastfmTuner.svc.apiCall('tag.getsimilar', {
			limit: 20,
			tag: info.name,
		}, function response(success, xml) {
			var results = LastfmTuner.collectResults(success, xml, "tag",
				DISPLAY_RELATED_TAGS_LIMIT);
			if (results == null) {
				dump("collect tag similar tags failed\n");
				return;
			}

			LastfmTuner.drawMultipleResults(results, "tag", "s", 9,
				$('.results', tagsDiv), function(station) {
						LastfmTuner.drawSingleTag(station.stationInfo);
					});
			tagsDiv.append("<div style='clear:left;' />");
			tagsDiv.fadeIn('slow');
			$(window).resize();
		});

		LastfmTuner.svc.apiCall('tag.gettopartists', {
			limit: 20,
			tag: info.name,
		}, function response(success, xml) {
			var results = LastfmTuner.collectResults(success, xml, "artist",
				DISPLAY_RELATED_ARTISTS_LIMIT);
			if (results == null) {
				dump("collect tag tagged artists failed\n");
				return;
			}

			LastfmTuner.drawMultipleResults(results, "artist", "l", 9,
				$('.results', artistsDiv), function(station) {
						LastfmTuner.drawSingleArtist(station.stationInfo);
					});
			artistsDiv.append("<div style='clear:left;' />");
			artistsDiv.fadeIn('slow');
			$(window).resize();
		});
	},

	drawSingleUser: function(info) {
		var userDetail = LastfmTuner._strings.GetStringFromName(
			"lastfm.radio.user.detail");
		$('#explorer').empty();
		$('#explorer').append("<h2 class='title'>" + userDetail + "</h2>");
		
		var info;
		var detailBlock = LastfmTuner.createDetailBlock(info, "user");
		$('#explorer').append(detailBlock);
		
		$('#explorer').append("<div style='clear:left;' />");

		$('#explorer').append("<div id='tags'>");
		var tagsDiv = $('#explorer > #tags');
		tagsDiv.hide();
		$('#explorer').append("<div id='artists'>");
		var artistsDiv = $('#explorer > #artists');
		artistsDiv.hide();

		var topTags = LastfmTuner._strings.GetStringFromName(
			"lastfm.radio.tags.top");
		var topArtists = LastfmTuner._strings.GetStringFromName(
			"lastfm.radio.artists.top");
		tagsDiv.append("<h3 class='subtitle'>" + topTags + "</h3>");
		tagsDiv.append("<div class='results'>");

		artistsDiv.append("<h3 class='subtitle'>" + topArtists + "</h3>");
		artistsDiv.append("<div class='results'>");

		LastfmTuner.svc.apiCall('user.getTopTags', {
			limit: 20,
			user: info.name
		}, function response(success, xml) {
			var results = LastfmTuner.collectResults(success, xml, "tag",
				DISPLAY_RELATED_TAGS_LIMIT);
			if (results == null) {
				dump("collect user top tags failed\n");
				return;
			}

			LastfmTuner.drawMultipleResults(results, "tag", "s", 9,
				$('.results', tagsDiv), function(station) {
						LastfmTuner.drawSingleTag(station.stationInfo);
					});
			tagsDiv.append("<div style='clear:left;' />");
			tagsDiv.fadeIn('slow');
			$(window).resize();
		});

		LastfmTuner.svc.apiCall('user.getTopArtists', {
			limit: 20,
			user: info.name
		}, function response(success, xml) {
			var results = LastfmTuner.collectResults(success, xml, "artist",
				DISPLAY_RELATED_ARTISTS_LIMIT);
			if (results == null) {
				dump("collect user top artists failed\n");
				return;
			}

			LastfmTuner.drawMultipleResults(results, "artist", "l", 9,
				$('.results', artistsDiv), function(station) {
						LastfmTuner.drawSingleArtist(station.stationInfo);
					});
			artistsDiv.append("<div style='clear:left;' />");
			artistsDiv.fadeIn('slow');
			$(window).resize();
		});
	},

	saveRecentStation: function(thisStation) {
		var prevIdx = -1;

		for (var i=0; i<LastfmTuner.recentStations.length; i++) {
			if (LastfmTuner.recentStations[i].stationUrl == thisStation.stationUrl) {
				prevIdx = i;
				break;
			}
		}
		if (prevIdx > -1) {
			dump("duplicate station found @ " + prevIdx + "\n");
			LastfmTuner.recentStations.splice(prevIdx, 1);
		}
		LastfmTuner.recentStations.push(thisStation);
		Application.prefs.setValue("extensions.lastfm.recent.stations",
			LastfmTuner.jsonSvc.encode(LastfmTuner.recentStations));
	},

	setHeaderDisplay: function() {
		var paintBlack = Application.prefs.getValue("extensions.lastfm.header",
																								false);
		var hTopEl = document.getElementById("header-top");
		$("#lastfm-header-style").empty();
		if (paintBlack) {
			// Set the background to Black
			$("#lastfm-header-style").append("Simply Red");
			hTopEl.setAttribute("paintblack", "true");
		} else {
			$("#lastfm-header-style").append("Paint it Black");
			hTopEl.setAttribute("paintblack", "false");
		}
	},
	
	toggleHeaderDisplay: function() {
		var paintBlack = Application.prefs.getValue("extensions.lastfm.header",
																								false);
		Application.prefs.setValue("extensions.lastfm.header", !paintBlack);
		this.setHeaderDisplay();
	},

	observe: function(subject, topic, data) {
		if (subject instanceof Components.interfaces.nsIPrefBranch) {
			if (data == "recent.stations") {
				dump("recent stations changed!\n");
				LastfmTuner.populateBox("nav-recent-stations",
						LastfmTuner.dataRecentStations);
			}
		}
	},

	/*
	 * Functions for returning data for populating search boxes
	 */
	dataRecentStations: function(populateCallback) {
		LastfmTuner.recentStations =
			LastfmTuner.jsonSvc.decode(Application.prefs.getValue(
				"extensions.lastfm.recent.stations", "[]"));
		while (LastfmTuner.recentStations.length > DISPLAY_RECENT_STATIONS_LIMIT)
			LastfmTuner.recentStations.shift();
		populateCallback(LastfmTuner.recentStations);
	},

	dataRecArtists: function(populateCallback) {
		LastfmTuner.svc.apiCall('user.getRecommendedArtists', {
		}, function response(success, xml) {
			var results = LastfmTuner.collectResults(success, xml, "artist");
			if (results == null) {
				dump("collect recommended artists failed\n");
				return;
			}
			populateCallback(results);
		});
	},
	
	dataTopArtists: function(populateCallback) {
		LastfmTuner.svc.apiCall('user.getTopArtists', {
			user: LastfmTuner.svc.username
		}, function response(success, xml) {
			var results = LastfmTuner.collectResults(success, xml, "artist");
			if (results == null) {
				dump("collect recommended artists failed\n");
				return;
			}
			populateCallback(results);
		});
	},
	
	dataTopTags: function(populateCallback) {
		LastfmTuner.svc.apiCall('user.getTopTags', {
			user: LastfmTuner.svc.username
		}, function response(success, xml) {
			var results = LastfmTuner.collectResults(success, xml, "tag");
			if (results == null) {
				dump("collect top tags failed\n");
				return;
			}
			populateCallback(results);
		});
	},
					
	dataMyFriends: function(populateCallback) {
		LastfmTuner.svc.apiCall('user.getFriends', {
			user: LastfmTuner.svc.username
		}, function response(success, xml) {
			var results = LastfmTuner.collectResults(success, xml, "user");
			if (results == null) {
				dump("collect my friends failed\n");
				return;
			}
			populateCallback(results);
		});
	},
			
	dataMyNeighbours: function(populateCallback) {
		LastfmTuner.svc.apiCall('user.getNeighbours', {
			user: LastfmTuner.svc.username
		}, function response(success, xml) {
			var results = LastfmTuner.collectResults(success, xml, "user");
			if (results == null) {
				dump("collect my neighbours failed\n");
				return;
			}
			populateCallback(results);
		});
	},

	dataSBCollect: function(primary, secondary, type, callback) {
		var lib = LibraryUtils.mainLibrary;
		var collectResults = lib.collectDistinctValues(primary,
			Ci.sbILibraryStatistics.COLLECT_SUM, secondary, false, 30);
		var results = new Array();
		for (var i=0; i<collectResults.length; i++) {
			var s = collectResults.queryElementAt(i, Ci.nsIVariant)
					.replace(/&/g, "&amp;").replace(/>/g, "gt;")
					.replace(/</g, "&lt;").replace(/"/g, "&quot;");
			var url = encodeURIComponent(s).replace(/'/g, "%27");
			results.push({
				type: type,
				name: s,
				url: "http://www.last.fm/" + type + "/" + url,
				stationUrl: "lastfm://" + type + "/" + url
			});
		}
		callback(results);
	},
	
	dataSBMostPlayedArtists: function(populateCallback) {
		LastfmTuner.dataSBCollect(SBProperties.artistName,
				SBProperties.playCount, "artist", populateCallback);
	},
	dataSBHighestRatedArtists: function(populateCallback) {
		LastfmTuner.dataSBCollect(SBProperties.artistName,
				SBProperties.rating, "artist", populateCallback);
	},
	dataSBGenres: function(populateCallback) {
		LastfmTuner.dataSBCollect(SBProperties.genre,
				SBProperties.playCount, "tag", populateCallback);
	},
			
	populateBox: function(elementId, dataCallback, limit) {
		var resultsEl = $('#' + elementId + "-results");
		resultsEl.empty();
		dataCallback(function(results) {
			if (results == null || results.length == 0)
				return;
			results.forEach(function(val, i, arr) {
				if ((!limit && (i >= LIMIT_NAV_RESULTS)) ||
					(limit && (i >= limit)))
					return;
				var rowClass = "row-even";
				if (i % 2)
					rowClass = "row-odd";
				var playStr = LastfmTuner._strings.GetStringFromName(
					"lastfm.radio.play");
				var stationEl = $(
					"<div class='nav-station " + rowClass + "'>" +
					"<div class='station-play-button'><a href='" +
					val.stationUrl + "'><img src='" + RADIO_ICON_SMALL + 
					"'/>" + playStr + "</a></div>" +
					"<img src ='chrome://sb-lastfm/skin/" + val.type +
					".png' class='icon-type' />" + val.name + "</div>");
				$(".station-play-button", stationEl).click(function(e) {
					e.stopPropagation();
					e.preventDefault();
					dump("Saving recent station\n");
					LastfmTuner.saveRecentStation(val);
					LastfmTuner.svc.radioPlay(val.stationUrl);
				});
				stationEl.click(function(e) {
					// Load this station in the explorer view
					dump("type: " + val.type + "\n");
					switch (val.type) {
						case "artist":
							LastfmTuner.drawSingleArtist(val);
							break;
						case "tag":
							LastfmTuner.drawSingleTag(val);
							break;
						case "user":
							LastfmTuner.drawSingleUser(val);
							break;
						default:
							// Load the station detail page in a tab
							gBrowser.loadOneTab(val.url);
					}
				});
				stationEl.hover(function(e) {
					this.oldClass = this.className;
					this.className += " row-selected";
				}, function(e) {
					this.className = this.oldClass;
				});
				resultsEl.append(stationEl);
			});
		});
	}
}
	
// Adjust height of explorer area
$(window).resize(function(e) {
  var bodyHeight = $('body')[0].scrollHeight;
	var height = bodyHeight - $('#header')[0].scrollHeight;
	var height2 = $('#left-content')[0].scrollHeight;
	//dump("Height: " + height + " or " + height2 + "\n");
	if (height2 > height)
		height = height2;
	$('#right-nav').css({"min-height":height});

  height = $('#content')[0].scrollHeight + $('#header')[0].scrollHeight;
  $("#wrapper-box").css({"height":bodyHeight, "max-height":bodyHeight});
  $("#login-page").css({"min-height":height});
  $("#subscriber-page").css({"min-height":height});
});

$(document).ready(function() {
	LastfmTuner.init();

	// Hide the nav bar entirely
	$("#right-nav-last-fm").hide();

	// Hide the user photo
	$("#user-profile").hide();

	// Hide the results blocks
	$('.nav-results:not(.selected)').hide();

	// Setup hovers for the user-stations box
	$('#nav-user-stations-results .nav-station').hover(function over(e) {
		this.oldClass = this.className;
		this.className += " row-selected";
	}, function(e) {
		this.className = this.oldClass;
	});

	// Setup the search box
	$('#search-box').focus(function() {
		$(this).css({"color": "#555"});
		this.value = "";
	});
	// Add click handlers for accordian riht hand nav
	$('#right-nav h3.nav-stations').click(function() {
		var resultsId = this.parentNode.parentNode.id + "-results";
		$('.nav-results:not(#'+resultsId+')').hide('fast');
		if ($('#' + resultsId).is(':hidden')) {
			$('#' + resultsId).slideDown('fast');
			this.className = "nav-stations selected";
		} else {
			$('#' + resultsId).hide('fast');
			this.className = "nav-stations";
		}
		$(window).resize();
	});

	// Locate the country we're coming from so we can update the
	// start-artists
	$("#start-artists").hide();
	$("#start-tags").hide();
	$.get("http://api.hostip.info/", {}, function(data) {
		LastfmTuner.myCountry =
			data.getElementsByTagName("countryName")[0].textContent;
		//dump("Country: " + LastfmTuner.myCountry + "\n");
		if (LastfmTuner.myCountry == "(Unknown Country?)")
			LastfmTuner.myCountry = "UNITED STATES";
		LastfmTuner.svc.apiCall('geo.getTopArtists', {
			country : LastfmTuner.myCountry
		}, function response(success, xml) {
			var results = LastfmTuner.collectResults(success, xml, "artist");
			if (results == null) {
				dump("collect geo top artists failed\n");
				return;
			}

			var e = $("#start-artists");
			LastfmTuner.drawMultipleResults(results, "artist", "l", 12, e,
				function(station) {
					LastfmTuner.drawSingleArtist(station.stationInfo);
			});
			e.slideDown("slow", function() {
        dump("start artists done -resize window\n");
				$(window).resize()
			});
		});
	}, "xml");
	
	LastfmTuner.svc.apiCall('tag.getTopTags', {},
			function response(success, xml) {
		var results = LastfmTuner.collectResults(success, xml, "tag");
		if (results == null) {
			dump("collect last.fm top tags failed\n");
			return;
		}

		var e = $("#start-tags");
		LastfmTuner.drawMultipleResults(results, "tag", "s", 12, e,
			function(station) {
				LastfmTuner.drawSingleTag(station.stationInfo);
		});
		e.slideDown("slow", function() {
        dump("start tags done -resize window\n");
			$(window).resize();
		});
	});

	$("#lastfm-user-info").click(function(e) {
		e.preventDefault();
		e.stopPropagation();
		gBrowser.loadOneTab(LastfmTuner.profileurl);
	});
	$("#lastfm-user-image").click(function(e) {
		e.preventDefault();
		e.stopPropagation();
		gBrowser.loadOneTab(LastfmTuner.profileurl);
	});


	// Update the login state
	LastfmTuner.onLoggedInStateChanged();
	if (LastfmTuner.svc.loggedIn) {
		LastfmTuner.onProfileUpdated();
		LastfmTuner.onLoginSucceeded();
	}
	
	if (LastfmTuner.svc.sk)
		LastfmTuner.onAuthorisationSuccess();

	if (LastfmTuner.svc.loggedIn) {
		// Focus the search box
		$("#search-box")[0].focus();
	}
});

window.addEventListener("unload", LastfmTuner.fini, false);
