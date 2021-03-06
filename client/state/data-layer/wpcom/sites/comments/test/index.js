/** @format */

/**
 * External dependencies
 */
import { expect } from 'chai';
import { spy } from 'sinon';

/**
 * Internal dependencies
 */
import {
	addComments,
	announceEditFailure,
	editComment,
	fetchCommentsList,
	requestComment,
	receiveCommentError,
	receiveCommentSuccess,
	removeCommentStatusErrorNotice,
} from '../';
import { COMMENTS_EDIT, COMMENTS_RECEIVE } from 'state/action-types';
import {
	requestComment as requestCommentAction,
	editComment as editCommentAction,
} from 'state/comments/actions';
import { bypassDataLayer } from 'state/data-layer/utils';
import { http } from 'state/data-layer/wpcom-http/actions';
import { errorNotice, removeNotice } from 'state/notices/actions';

const query = {
	siteId: 1337,
	status: 'unapproved',
	type: 'comment',
};

describe( '#addComments', () => {
	let dispatch;

	beforeEach( () => ( dispatch = spy() ) );

	it( 'should dispatch a tree initialization action for no comments', () => {
		addComments( { dispatch }, { query }, { comments: [] } );

		expect( dispatch ).to.have.been.calledOnce;
		expect( dispatch.lastCall ).to.have.been.calledWith( {
			type: 'COMMENTS_TREE_SITE_ADD',
			siteId: query.siteId,
			status: query.status,
			tree: [],
		} );
	} );

	it( 'should dispatch to add received comments into state', () => {
		const comments = [ { ID: 5, post: { ID: 1 } }, { ID: 6, post: { ID: 1 } } ];

		addComments( { dispatch }, { query }, { comments } );

		expect( dispatch ).to.have.been.calledOnce;
		expect( dispatch.lastCall ).to.have.been.calledWith( {
			type: 'COMMENTS_RECEIVE',
			siteId: query.siteId,
			postId: 1,
			comments,
		} );
	} );

	it( 'should dispatch received comments into separate actions per post', () => {
		const comments = [
			{ ID: 5, post: { ID: 1 } },
			{ ID: 6, post: { ID: 2 } },
			{ ID: 2, post: { ID: 1 } },
		];

		addComments( { dispatch }, { query }, { comments } );

		expect( dispatch ).to.have.been.calledTwice;

		expect( dispatch ).to.have.been.calledWithMatch( {
			postId: 1,
			comments: [ comments[ 0 ], comments[ 2 ] ],
		} );

		expect( dispatch ).to.have.been.calledWithMatch( {
			postId: 2,
			comments: [ comments[ 1 ] ],
		} );
	} );
} );

describe( '#fetchCommentList', () => {
	let dispatch;

	beforeEach( () => ( dispatch = spy() ) );

	it( 'should do nothing if no listType provided', () => {
		fetchCommentsList( { dispatch }, { query } );

		expect( dispatch ).to.have.not.been.called;
	} );

	it( 'should do nothing if invalid listType provided', () => {
		fetchCommentsList( { dispatch }, { query: { ...query, listType: 'Calypso' } } );

		expect( dispatch ).to.have.not.been.called;
	} );

	it( 'should dispatch HTTP request for site comments', () => {
		fetchCommentsList( { dispatch }, { query: { ...query, listType: 'site' } } );

		expect( dispatch ).to.have.been.calledWithMatch( {
			type: 'WPCOM_HTTP_REQUEST',
			path: '/sites/1337/comments',
		} );
	} );

	it( 'should default to fetch pending comments', () => {
		fetchCommentsList( { dispatch }, { query: { listType: 'site', siteId: 1337 } } );

		expect( dispatch ).to.have.been.calledWithMatch( { query: { status: 'unapproved' } } );
	} );

	it( 'should default to fetch comment-type comments', () => {
		fetchCommentsList( { dispatch }, { query: { listType: 'site', siteId: 1337 } } );

		expect( dispatch ).to.have.been.calledWithMatch( { query: { type: 'comment' } } );
	} );
} );

describe( '#requestComment', () => {
	let dispatch;
	beforeEach( () => ( dispatch = spy() ) );

	it( 'should dispatch http action', () => {
		const siteId = '124';
		const commentId = '579';
		const action = requestCommentAction( { siteId, commentId } );

		requestComment( { dispatch }, action );

		expect( dispatch ).calledWith(
			http( {
				method: 'GET',
				path: `/sites/${ siteId }/comments/${ commentId }`,
				apiVersion: '1.1',
				onSuccess: action,
				onFailure: action,
			} )
		);
	} );
} );

describe( '#receiveCommentSuccess', () => {
	let dispatch;
	beforeEach( () => ( dispatch = spy() ) );

	it( 'should dispatch receive comments with a single comment', () => {
		const siteId = '124';
		const commentId = '579';
		const response = { post: { ID: 1 } };
		const action = requestCommentAction( { siteId, commentId } );

		receiveCommentSuccess( { dispatch }, action, response );

		expect( dispatch ).calledWith( {
			type: COMMENTS_RECEIVE,
			siteId,
			postId: response.post.ID,
			comments: [ response ],
			commentById: true,
		} );
	} );
} );

describe( '#receiveCommentError', () => {
	let dispatch;
	beforeEach( () => ( dispatch = spy() ) );

	it( 'should dispatch receive comments with a single comment', () => {
		const siteId = '124';
		const commentId = '579';
		const response = { post: { ID: 1 } };
		const action = requestCommentAction( { siteId, commentId } );
		const getState = () => ( {
			reader: {
				sites: {
					items: {
						124: { title: 'sqeeeeee!' },
					},
				},
			},
		} );

		receiveCommentError( { dispatch, getState }, action, response );
		expect( dispatch ).to.have.been.calledWithMatch( {
			notice: {
				text: 'Failed to retrieve comment for site “sqeeeeee!”',
			},
		} );
	} );
} );

describe( '#editComment', () => {
	let dispatch;

	beforeEach( () => ( dispatch = spy() ) );

	it( 'should dispatch a http action', () => {
		const originalComment = { ID: 123, text: 'lorem ipsum' };
		const newComment = { ID: 123, text: 'lorem ipsum dolor' };
		const action = editCommentAction( 1, 1, 123, newComment );
		const getState = () => ( {
			comments: {
				items: {
					'1-1': [ originalComment ],
				},
			},
		} );

		editComment( { dispatch, getState }, action );

		expect( dispatch ).calledWith(
			http(
				{
					method: 'POST',
					path: '/sites/1/comments/123',
					apiVersion: '1.1',
					body: newComment,
				},
				{
					...action,
					originalComment,
				}
			)
		);
	} );
} );

describe( '#removeCommentStatusErrorNotice', () => {
	let dispatch;

	beforeEach( () => ( dispatch = spy() ) );

	it( 'should dispatch a remove notice action', () => {
		removeCommentStatusErrorNotice( { dispatch }, { commentId: 123 } );

		expect( dispatch ).to.have.been.calledWith( removeNotice( 'comment-notice-error-123' ) );
	} );
} );

describe( '#announceEditFailure', () => {
	let dispatch;
	const originalComment = { ID: 123, text: 'lorem ipsum' };
	const newComment = { ID: 123, text: 'lorem ipsum dolor' };
	const action = editCommentAction( 1, 1, 123, newComment );

	beforeEach( () => ( dispatch = spy() ) );

	it( 'should dispatch a local comment edit action', () => {
		announceEditFailure( { dispatch }, { ...action, originalComment } );

		expect( dispatch ).to.have.been.calledWith(
			bypassDataLayer( {
				type: COMMENTS_EDIT,
				siteId: 1,
				postId: 1,
				commentId: 123,
				comment: originalComment,
			} )
		);
	} );

	it( 'should dispatch a remove notice action', () => {
		announceEditFailure( { dispatch }, { ...action, originalComment } );

		expect( dispatch ).to.have.been.calledWith( removeNotice( 'comment-notice-123' ) );
	} );

	it( 'should dispatch an error notice', () => {
		announceEditFailure( { dispatch }, { ...action, originalComment } );

		expect( dispatch ).to.have.been.calledWith(
			errorNotice( "We couldn't update this comment.", {
				id: `comment-notice-error-${ action.commentId }`,
			} )
		);
	} );
} );
