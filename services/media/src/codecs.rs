//! Router media codecs.
//!
//! The order here is not a preference, it is load-bearing. The captured client picks its encoding
//! strategy from the *first video codec the router advertises*
//! (`docs/source/main.d6d3c112b59b7d0d.js`):
//!
//! ```js
//! if (e.useSharingSimulcast) {
//!   const h = e.device.rtpCapabilities.codecs.find(f => "video" === f.kind);
//!   r = e.forceVP9 || "video/vp9" === h.mimeType.toLowerCase() ? XS : QS.map(f => ({...f, dtx:!0}))
//! }
//! // XS = [{ scalabilityMode: "S3T3", dtx: true }]                          <- VP9 SVC
//! // QS = [{ dtx: true, maxBitrate: 15e5 }, { dtx: true, maxBitrate: 6e6 }] <- 2-layer simulcast
//! ```
//!
//! A router that advertises H.264 first can never reach the VP9 SVC path - the client silently
//! falls back to two-layer simulcast. VP9 therefore leads, with H.264 and VP8 behind it for
//! endpoints that cannot do VP9.
//!
//! The `rtcp_feedback` lists match mediasoup's own `supported_rtp_capabilities`: without them the
//! router negotiates video with no NACK, PLI, FIR, REMB or transport-cc, which costs recovery and
//! congestion control rather than failing outright.
//!
//! # What is deliberately *not* here
//!
//! **No Opus `usedtx` / `useinbandfec`.** The only audio configuration in the capture turns both
//! off: `codecOptions:{opusStereo:!1,opusDtx:!1,opusFec:!1}` on the microphone producer (byte
//! 1083612), which our client reproduces verbatim (`src/lib/media/session.ts:110-114`). An earlier
//! version of this file advertised `usedtx: 1` and `useinbandfec: 1` and justified it with "every
//! captured encoding carries `dtx: true`" - but those are `XS` and `QS`, the *video* encoding
//! constants (bytes 1071656 and 1071710), and they are unreachable in the deployed build anyway
//! because `useSharingSimulcast` is assigned `false` in the constructor and never reassigned (byte
//! 1072430). A video encoding flag is not evidence about an audio codec, so the parameters it was
//! used to justify are gone.
//!
//! **No `x-google-start-bitrate`.** In the capture that value is not a router capability at all: it
//! is a per-produce `codecOptions` field, and `codecOptions` are purely client-side SDP munging
//! that never reach the server (byte 2832660). It is also not one value - the webcam passes `1e3`
//! (byte 1088100) and the screen share `1e5` (byte 1103666), a hundredfold apart, precisely because
//! the right answer differs per track. A single number baked into every video codec the router
//! advertises can only be wrong for one of them, so the choice stays where the capture puts it, on
//! the client, per produce (`WEBCAM_START_BITRATE` / `SCREEN_START_BITRATE`,
//! `src/lib/media/session.ts:93-100`).

use mediasoup::types::rtp_parameters::{
    MimeTypeAudio, MimeTypeVideo, RtcpFeedback, RtpCodecCapability, RtpCodecParametersParameters,
};
use std::num::{NonZeroU32, NonZeroU8};

fn video_rtcp_feedback() -> Vec<RtcpFeedback> {
    vec![
        RtcpFeedback::Nack,
        RtcpFeedback::NackPli,
        RtcpFeedback::CcmFir,
        RtcpFeedback::GoogRemb,
        RtcpFeedback::TransportCc,
    ]
}

/// The router's advertised capabilities, in the order the client sees them.
pub fn media_codecs() -> Vec<RtpCodecCapability> {
    vec![
        RtpCodecCapability::Audio {
            mime_type: MimeTypeAudio::Opus,
            preferred_payload_type: None,
            clock_rate: NonZeroU32::new(48_000).expect("non-zero"),
            channels: NonZeroU8::new(2).expect("non-zero"),
            // Empty on purpose - see "What is deliberately not here" in the module docs.
            parameters: RtpCodecParametersParameters::default(),
            rtcp_feedback: vec![RtcpFeedback::TransportCc],
        },
        // VP9 first: this is what puts the client on the `S3T3` SVC path.
        RtpCodecCapability::Video {
            mime_type: MimeTypeVideo::Vp9,
            preferred_payload_type: None,
            clock_rate: NonZeroU32::new(90_000).expect("non-zero"),
            parameters: RtpCodecParametersParameters::default(),
            rtcp_feedback: video_rtcp_feedback(),
        },
        // The three H.264 parameters that *are* here are not defaults: `packetization-mode` and
        // `profile-level-id` are compared by mediasoup's `match_codecs`, so a router that omits
        // them negotiates a different profile than the browser offered.
        RtpCodecCapability::Video {
            mime_type: MimeTypeVideo::H264,
            preferred_payload_type: None,
            clock_rate: NonZeroU32::new(90_000).expect("non-zero"),
            parameters: RtpCodecParametersParameters::from([
                ("packetization-mode", 1_u32.into()),
                ("profile-level-id", "42e01f".into()),
                ("level-asymmetry-allowed", 1_u32.into()),
            ]),
            rtcp_feedback: video_rtcp_feedback(),
        },
        RtpCodecCapability::Video {
            mime_type: MimeTypeVideo::Vp8,
            preferred_payload_type: None,
            clock_rate: NonZeroU32::new(90_000).expect("non-zero"),
            parameters: RtpCodecParametersParameters::default(),
            rtcp_feedback: video_rtcp_feedback(),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    fn video_mime_types() -> Vec<MimeTypeVideo> {
        media_codecs()
            .into_iter()
            .filter_map(|codec| match codec {
                RtpCodecCapability::Video { mime_type, .. } => Some(mime_type),
                RtpCodecCapability::Audio { .. } => None,
            })
            .collect()
    }

    /// The whole point of this module: the first video codec decides the client's encoding path.
    #[test]
    fn advertises_vp9_as_the_first_video_codec() {
        assert_eq!(
            video_mime_types().first().copied(),
            Some(MimeTypeVideo::Vp9),
            "the captured client reads the first video codec to choose SVC over simulcast"
        );
    }

    #[test]
    fn offers_h264_and_vp8_as_fallbacks() {
        assert_eq!(
            video_mime_types(),
            vec![MimeTypeVideo::Vp9, MimeTypeVideo::H264, MimeTypeVideo::Vp8]
        );
    }

    /// Without these the router negotiates video with no loss recovery or congestion control.
    #[test]
    fn every_video_codec_carries_the_standard_feedback() {
        for codec in media_codecs() {
            if let RtpCodecCapability::Video {
                mime_type,
                rtcp_feedback,
                ..
            } = codec
            {
                for expected in [
                    RtcpFeedback::Nack,
                    RtcpFeedback::NackPli,
                    RtcpFeedback::CcmFir,
                    RtcpFeedback::GoogRemb,
                    RtcpFeedback::TransportCc,
                ] {
                    assert!(
                        rtcp_feedback.contains(&expected),
                        "{mime_type:?} is missing {expected:?}"
                    );
                }
            }
        }
    }

    /// The only audio configuration the capture contains turns DTX, FEC and stereo off
    /// (`codecOptions:{opusStereo:!1,opusDtx:!1,opusFec:!1}`, byte 1083612), so the router must not
    /// advertise the opposite. The `dtx: true` that appears in `XS`/`QS` is a *video* encoding flag
    /// (bytes 1071656, 1071710) and is not evidence about Opus.
    #[test]
    fn opus_advertises_the_captured_configuration() {
        let audio = media_codecs()
            .into_iter()
            .find_map(|codec| match codec {
                RtpCodecCapability::Audio { parameters, .. } => Some(parameters),
                RtpCodecCapability::Video { .. } => None,
            })
            .expect("an audio codec is advertised");

        assert_eq!(
            audio.get("usedtx"),
            None,
            "the capture's microphone sets opusDtx:false"
        );
        assert_eq!(
            audio.get("useinbandfec"),
            None,
            "the capture's microphone sets opusFec:false"
        );
    }

    /// `videoGoogleStartBitrate` is a per-produce `codecOptions` field in the capture, and there
    /// are two different values for it - `1e3` for the webcam (byte 1088100) and `1e5` for the
    /// screen share (byte 1103666). One router-wide number would silently be wrong for one of the
    /// two, so the router advertises none and the client chooses per track.
    #[test]
    fn no_video_codec_pins_a_router_wide_start_bitrate() {
        for codec in media_codecs() {
            if let RtpCodecCapability::Video {
                mime_type,
                parameters,
                ..
            } = codec
            {
                assert_eq!(
                    parameters.get("x-google-start-bitrate"),
                    None,
                    "{mime_type:?} pins a start bitrate the client should be choosing per produce"
                );
            }
        }
    }

    /// The H.264 parameters that remain are load-bearing: mediasoup's `match_codecs` compares
    /// `packetization-mode` and `profile-level-id`, so dropping them changes what gets negotiated.
    #[test]
    fn h264_keeps_the_parameters_codec_matching_compares() {
        let h264 = media_codecs()
            .into_iter()
            .find_map(|codec| match codec {
                RtpCodecCapability::Video {
                    mime_type: MimeTypeVideo::H264,
                    parameters,
                    ..
                } => Some(parameters),
                _ => None,
            })
            .expect("H264 is advertised");

        assert_eq!(h264.get("packetization-mode"), Some(&1_u32.into()));
        assert_eq!(h264.get("profile-level-id"), Some(&"42e01f".into()));
    }
}
