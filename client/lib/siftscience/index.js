/**
 * External dependencies
 */
import debugFactory from 'debug';

const debug = debugFactory( 'calypso:siftscience' );

/**
 * Internal dependencies
 */
import loadScript from 'lib/load-script';

import user from 'lib/user';
import config from 'config';

var SIFTSCIENCE_URL = 'https://cdn.siftscience.com/s.js',
	hasLoaded = false;

if ( ! window._sift ) {
	window._sift = [];
}
/**
 * Expose `SiftScience`
 */
module.exports = {
	recordUser: function() {
		if ( ! hasLoaded ) {
			window._sift.push( [ '_setAccount', config( 'siftscience_key' ) ] );
			window._sift.push( [ '_setUserId', user().get().ID ] );
			window._sift.push( [ '_trackPageview' ] );

			hasLoaded = true;
			loadScript.loadScript( SIFTSCIENCE_URL, function( error ) {
				if ( error ) {
					debug( 'Error loading siftscience' );
				} else {
					debug( 'siftscience loaded successfully' );
				}
			} );
		}
	}
};
