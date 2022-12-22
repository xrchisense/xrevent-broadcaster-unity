import {Janus as janus} from "janus-gateway";


var janusServer = null;
var streamingHandle = null;
var opaqueId = "janusTest-"+janus.randomString(12);

var remoteTracks = {}, remoteVideos = 0, dataMid = null;
var bitrateTimer = {};
var autoplayAllowed = false;
var readytoPlay = false;

var streamsList = {};
var selectedStream = 122;

$(document).ready(function () {
    document.getElementById("startStreamButton").addEventListener('click',startStream);
    document.getElementById("videoblockedButton").addEventListener('click',playCall);
    $("#joinButton").attr('disabled',false);
    janus.init({
        debug: true,
        dependencies: janus.useDefaultDependencies(), // or: Janus.useOldDependencies() to get the behaviour of previous Janus versions
        callback: function () {
            connectToRoom();
        }
    });

    setTimeout(function(){
        if ( document.getElementById("videoTest").innerHTML == "autoplay"){
            playCall();
        }
    },2000);
    
});

function playCall() {
    console.warn("ReadyToPlay: "+readytoPlay);
    if (readytoPlay) {
        startStream();
    }
    autoplayAllowed = true;
    document.getElementById("videoblockedButton").hidden = true;
    document.getElementById("videoTest").hidden = true;
}


function connectToRoom () {
    // Make sure the browser supports WebRTC
    if (!janus.isWebrtcSupported()) {
        bootbox.alert("No WebRTC support... ");
        return;
    }

    janusServer = new janus(
        {
            server: 'https://vmd22715.contaboserver.net/janus',
            success: function() {
                janusServer.attach({
                    plugin: "janus.plugin.streaming",
                    success: function(pluginHandle) {
                        // Plugin attached! 'pluginHandle' is our handle
                        streamingHandle = pluginHandle;
                        updateStreamsList();
                        
                        //setup button to stop!

                        /* $('#start').removeAttr('disabled').html("Stop")
                            .click(function() {
                                $(this).attr('disabled', true);
                                for(var i in bitrateTimer)
                                    clearInterval(bitrateTimer[i]);
                                bitrateTimer = {};
                                janus.destroy();
                                $('#streamslist').attr('disabled', true);
                                $('#watch').attr('disabled', true).unbind('click');
                                $('#start').attr('disabled', true).html("Bye").unbind('click');
                            }); */
                    },
                    slowLink: function(uplink, lost, mid) {
                        janus.warn("Janus reports problems " + (uplink ? "sending" : "receiving") +
                            " packets on mid " + mid + " (" + lost + " lost packets)");
                    },
                    error: function(cause) {
                        janus.error("  -- Error attaching plugin... ", cause);
                        bootbox.alert("Error attaching plugin... " + cause);
                    },
                    consentDialog: function(on) {
                        // e.g., Darken the screen if on=true (getUserMedia incoming), restore it otherwise
                    },
                    onmessage: function(msg, jsep) {
                        janus.debug(" ::: Got a message :::", msg);
                        // We got a message/event (msg) from the plugin
                        var result = msg["result"];
                        if(result) {
                            if(result["status"]) {
                                var status = result["status"];
                                if(status === 'starting')
                                    $("#joinButton").text("starting....");
                                else if(status === 'started')
                                $("#joinButton").text("started");
                                else if(status === 'stopped')
                                    stopStream();
                            } else if(msg["streaming"] === "event") {
                                // Does this event refer to a mid in particular?
                                var mid = result["mid"] ? result["mid"] : "0";
                                // Is simulcast in place?
                                var substream = result["substream"];
                                var temporal = result["temporal"];
                                if((substream !== null && substream !== undefined) || (temporal !== null && temporal !== undefined)) {
                                    if(!simulcastStarted[mid]) {
                                        simulcastStarted[mid] = true;
                                        addSimulcastButtons(mid);
                                    }
                                    // We just received notice that there's been a switch, update the buttons
                                    updateSimulcastButtons(mid, substream, temporal);
                                }
                                // Is VP9/SVC in place?
                                var spatial = result["spatial_layer"];
                                temporal = result["temporal_layer"];
                                if((spatial !== null && spatial !== undefined) || (temporal !== null && temporal !== undefined)) {
                                    if(!svcStarted[mid]) {
                                        svcStarted[mid] = true;
                                        addSvcButtons(mid);
                                    }
                                    // We just received notice that there's been a switch, update the buttons
                                    updateSvcButtons(mid, spatial, temporal); 
                                }
                            }
                        } else if(msg["error"]) {
                            bootbox.alert(msg["error"]);
                            stopStream();
                            return;
                        }
                        if(jsep) {
                            janus.debug("Handling SDP as well...", jsep);
                            var stereo = (jsep.sdp.indexOf("stereo=1") !== -1);
                            // Offer from the plugin, let's answer
                            streamingHandle.createAnswer(
                                {
                                    jsep: jsep,
                                    // We only specify data channels here, as this way in
                                    // case they were offered we'll enable them. Since we
                                    // don't mention audio or video tracks, we autoaccept them
                                    // as recvonly (since we won't capture anything ourselves)
                                    tracks: [
                                        { type: 'data' }
                                    ],
                                    customizeSdp: function(jsep) {
                                        if(stereo && jsep.sdp.indexOf("stereo=1") == -1) {
                                            // Make sure that our offer contains stereo too
                                            jsep.sdp = jsep.sdp.replace("useinbandfec=1", "useinbandfec=1;stereo=1");
                                        }
                                    },
                                    success: function(jsep) {
                                        janus.debug("Got SDP!", jsep);
                                        var body = { request: "start" };
                                        streamingHandle.send({ message: body, jsep: jsep });
                                    },
                                    error: function(error) {
                                        janus.error("WebRTC error:", error);
                                        bootbox.alert("WebRTC error... " + error.message);
                                    }
                                });
                        }
                        // If jsep is not null, this involves a WebRTC negotiation
                        //TODO
                    },
                    onlocaltrack: function(track, added) {
                        // A local track to display has just been added (getUserMedia worked!) or removed
                    },
                    onremotetrack: function(track, mid, added) {
                        // A remote track (working PeerConnection!) with a specific mid has just been added or removed
                        console.log("remoteTRACK!!!!");
                        //TODO Check if a track was created !
                        var mstreamId = "mstream"+mid;
                        var stream = null;
                        if(track.kind === "audio") {
                            // New audio track: create a stream out of it, and use a hidden <audio> element
                            stream = new MediaStream([track]);
                            remoteTracks[mid] = stream;
                            janus.log("Created remote audio stream:", stream);
                            $('#video').append('<audio class="hide" id="remotevideo' + mid + '" playsinline/>');
                            $('#remotevideo'+mid).get(0).volume = 0;
                            if(remoteVideos === 0) {
                                // No video, at least for now: show a placeholder
                                if($('#'+mstreamId+' .no-video-container').length === 0) {
                                    $('#'+mstreamId).append(
                                        '<div class="no-video-container audioonly">' +
                                            '<i class="fa fa-video-camera fa-5 no-video-icon"></i>' +
                                            '<span class="no-video-text">No webcam available</span>' +
                                        '</div>');
                                }
                            }
                        } else {
                            // New video track: create a stream out of it
                            remoteVideos++;
                            $('.no-video-container').remove();
                            stream = new MediaStream([track]);
                            remoteTracks[mid] = stream;
                            janus.log("Created remote video stream:", stream);
                            $('#video').append('<video class="rounded centered hide" id="remotevideo' + mid + '" width="100%" height="100%" playsinline/>');
                            $('#remotevideo'+mid).get(0).volume = 0;
                            // Use a custom timer for this stream
                        }
                        // Play the stream and hide the spinner when we get a playing event
                        $("#remotevideo" + mid).bind("playing", function (ev) {
                            $('.waitingvideo').remove();
                            if(!this.videoWidth)
                                return;
                        });
                        /* document.getElementById("startStreamButton").removeEventListener('click',startStream);
                        document.getElementById("startStreamButton").addEventListener('click',function(){
                            $('#remotevideov').play();
                            $('#remotevideov').volume = 1;
                        }); */
                        janus.attachMediaStream($('#remotevideo' + mid).get(0), stream);
                        $('#remotevideo' + mid).get(0).play();
                        $('#remotevideo' + mid).get(0).volume = 1;
                        

                    },
                    oncleanup: function() {
                        // PeerConnection with the plugin closed, clean the UI
                        // The plugin handle is still valid so we can create a new one
                    },
                    detached: function() {
                        // Connection with the plugin closed, get rid of its features
                        // The plugin handle is not valid anymore
                    }
                });
                
                // Done! attach to plugin XYZ
            },
            error: function(cause) {
                console.error(cause);
            },
            destroyed: function() {
                // I should get rid of this
            }
    });
}



function startStream() {
	// Add some panels to host the remote streams
	if(streamsList[selectedStream].legacy) {
		// At max 1-audio/1-video, so use a single panel
		var mid = null;
		for(mi in streamsList[selectedStream].media) {
			// Add a new panel
			var type = streamsList[selectedStream].media[mi].type;
			if(type === "video") {
				mid = streamsList[selectedStream].media[mi].mid;
				break;
			}
		}
		
			// No remote video yet
			$('#video').append('<video class="rounded centered waitingvideo" id="waitingvideo0" width="100%" height="100%" />');
		
		/* if(mid) {
			if(spinner[mid] == null) {
				var target = document.getElementById('video');
				spinner[mid] = new Spinner({top:100}).spin(target);
			} else {
				spinner[mid].spin();
			}
		} */
		/* dataMid = "0"; */
	} else {
		// Multistream mountpoint, create a panel for each stream
		for(var mi in streamsList[selectedStream].media) {
			// Add a new panel
			var type = streamsList[selectedStream].media[mi].type;
			var mid = streamsList[selectedStream].media[mi].mid;
			var label = streamsList[selectedStream].media[mi].label;
			
				// No remote media yet
				$('#video').append('<video class="rounded centered waitingvideo" id="waitingvideo'+mid+'" width="100%" height="100%" />');
			
			/* if(spinner[mid] == null) {
				var target = document.getElementById('mstream'+mid);
				spinner[mid] = new Spinner({top:100}).spin(target);
			} else {
				spinner[mid].spin();
			}
			if(type === 'data')
				dataMid = mid; */
		}
	}
	// Prepare the request to start streaming and send it
	var body = { request: "watch", id: 122};
	// Notice that, for RTP mountpoints, you can subscribe to a subset
	// of the mountpoint media, rather than them all, by adding a "stream"
	// array containing the list of stream mids you're interested in, e.g.:
	//
	//		body.streams = [ "0", "2" ];
	//
	// to only subscribe to the first and third stream, and skip the second
	// (assuming those are the mids you got from a "list" or "info" request).
	// By default, you always subscribe to all the streams in a mountpoint
	streamingHandle.send({ message: body });
	// Get some more info for the mountpoint to display, if any
	/* getStreamInfo(); */
}

function updateStreamsList() {
	var body = { request: "list" };
	janus.debug("Sending message:", body);
	streamingHandle.send({ message: body, success: function(result) {
		if(!result) {
			bootbox.alert("Got no response to our query for available streams");
			return;
		}
		if(result["list"]) {
			var list = result["list"];
			if(list && Array.isArray(list)) {
				list.sort(function(a, b) {
					if(!a || a.id < (b ? b.id : 0))
						return -1;
					if(!b || b.id < (a ? a.id : 0))
						return 1;
					return 0;
				});
			}
			janus.log("Got a list of available streams:", list);
			streamsList = {};
			for(var mp in list) {
				janus.debug("  >> [" + list[mp]["id"] + "] " + list[mp]["description"] + " (" + list[mp]["type"] + ")");
				// Check the nature of the available streams, and if there are some multistream ones
				list[mp].legacy = true;
				if(list[mp].media) {
					var audios = 0, videos = 0;
					for(var mi in list[mp].media) {
						if(!list[mp].media[mi])
							continue;
						if(list[mp].media[mi].type === "audio")
							audios++;
						else if(list[mp].media[mi].type === "video")
							videos++;
						if(audios > 1 || videos > 1) {
							list[mp].legacy = false;
							break;
						}
					}
				}
				// Keep track of all the available streams
				streamsList[list[mp]["id"]] = list[mp];
                console.warn(streamsList);
			}
            
		}
        readytoPlay = true;
        if (autoplayAllowed) {
            startStream();
        }
        
    }});

}
