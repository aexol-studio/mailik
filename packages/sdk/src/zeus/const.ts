/* eslint-disable */

export const AllTypesProps: Record<string,any> = {
	UsersProviderErrors: "enum" as const,
	ProjectOps:{
		update:{
			project:"UpdateProject"
		}
	},
	UserMutation:{
		createTeam:{

		},
		joinToTeam:{

		},
		joinToTeamWithInvitationToken:{

		}
	},
	UsersGenerateInviteTokenError: "enum" as const,
	LoginQuery:{
		password:{
			user:"UsersLoginInput"
		},
		provider:{
			params:"UsersProviderLoginInput"
		},
		refreshToken:{

		},
		requestForForgotPassword:{

		}
	},
	Mutation:{
		adminMemberMutation:{

		}
	},
	CreateProject:{

	},
	UsersJoinToTeamError: "enum" as const,
	UsersInvitationTeamStatus: "enum" as const,
	AdminMemberMutation:{
		deleteInviteToken:{

		},
		generateInviteToken:{
			tokenOptions:"UsersInviteTokenInput"
		},
		removeUserFromTeam:{
			data:"UsersRemoveUserFromTeamInput"
		},
		sendInvitationToTeam:{
			invitation:"UsersSendTeamInvitationInput"
		}
	},
	UsersLoginErrors: "enum" as const,
	UsersProviderLoginInput:{

	},
	AdminMemberQuery:{
		showTeamInvitations:{
			status:"UsersInvitationTeamStatus"
		}
	},
	UsersInviteTokenInput:{

	},
	UsersLoginInput:{

	},
	MailMutation:{
		sendMail:{
			mail:"MailInput"
		}
	},
	AdminMutation:{
		addProject:{
			project:"CreateProject"
		},
		projectOps:{

		}
	},
	MailInput:{

	},
	UsersCreateTeamError: "enum" as const,
	UsersSendTeamInvitationInput:{

	},
	UsersChangePasswordWithTokenInput:{

	},
	UsersRegisterInput:{

	},
	UsersSendInvitationToTeamError: "enum" as const,
	AdminQuery:{
		projects:{

		}
	},
	UsersRemoveUserFromTeamInput:{

	},
	Query:{
		adminMemberQuery:{
			status:"UsersInvitationTeamStatus"
		},
		getGoogleOAuthLink:{
			setup:"UsersGetOAuthInput"
		},
		memberQuery:{

		}
	},
	UsersGetOAuthInput:{

	},
	UserQuery:{
		showTeamInvitations:{
			status:"UsersInvitationTeamStatus"
		}
	},
	UpdateProject:{

	},
	UsersRegisterErrors: "enum" as const,
	UsersChangePasswordWithTokenError: "enum" as const,
	UsersJoinToTeamWithInvitationTokenError: "enum" as const,
	PublicMutation:{
		changePasswordWithToken:{
			token:"UsersChangePasswordWithTokenInput"
		},
		register:{
			user:"UsersRegisterInput"
		},
		verifyEmail:{
			verifyData:"UsersVerifyEmailInput"
		}
	},
	UsersVerifyEmailInput:{

	},
	UsersVerifyEmailError: "enum" as const
}

export const ReturnTypes: Record<string,any> = {
	UsersInvitationTeamToken:{
		_id:"String",
		recipient:"String",
		status:"UsersInvitationTeamStatus",
		teamId:"String",
		teamName:"String"
	},
	ProjectOps:{
		delete:"Boolean",
		update:"Boolean"
	},
	MemberQuery:{
		team:"UsersTeam"
	},
	UserMutation:{
		createTeam:"UsersCreateTeamResponse",
		joinToTeam:"UsersJoinToTeamResponse",
		joinToTeamWithInvitationToken:"UsersJoinToTeamWithInvitationTokenResponse"
	},
	LoginQuery:{
		password:"UsersLoginResponse",
		provider:"UsersProviderLoginQuery",
		refreshToken:"String",
		requestForForgotPassword:"Boolean"
	},
	Mutation:{
		admin:"AdminMutation",
		adminMemberMutation:"AdminMemberMutation",
		mail:"MailMutation",
		public:"PublicMutation",
		userMutation:"UserMutation"
	},
	UsersRegisterResponse:{
		hasError:"UsersRegisterErrors",
		registered:"Boolean"
	},
	UsersVerifyEmailResponse:{
		hasError:"UsersVerifyEmailError",
		result:"Boolean"
	},
	UsersRemoveUserFromTeamResponse:{
		hasError:"UsersGenerateInviteTokenError",
		result:"Boolean"
	},
	UsersNode:{
		"...on UsersInvitationTeamToken": "UsersInvitationTeamToken",
		"...on UsersUserAuth": "UsersUserAuth",
		"...on UsersTeam": "UsersTeam",
		"...on UsersUser": "UsersUser",
		"...on UsersInviteToken": "UsersInviteToken",
		"...on UsersTeamAuthType": "UsersTeamAuthType",
		"...on UsersTeamMember": "UsersTeamMember",
		"...on UsersSocial": "UsersSocial",
		_id:"String"
	},
	UsersGenerateInviteTokenResponse:{
		hasError:"UsersGenerateInviteTokenError",
		result:"String"
	},
	UsersUserAuth:{
		_id:"String",
		password:"String",
		username:"String"
	},
	UsersProviderResponse:{
		accessToken:"String",
		hasError:"UsersProviderErrors",
		jwt:"String",
		providerAccessToken:"String",
		refreshToken:"String",
		register:"Boolean"
	},
	UsersTeam:{
		_id:"String",
		createdAt:"String",
		members:"UsersTeamMember",
		name:"String",
		owner:"String"
	},
	UsersUser:{
		_id:"String",
		createdAt:"String",
		emailConfirmed:"Boolean",
		teams:"UsersTeam",
		username:"String"
	},
	AdminMemberMutation:{
		deleteInviteToken:"Boolean",
		generateInviteToken:"UsersGenerateInviteTokenResponse",
		removeUserFromTeam:"UsersRemoveUserFromTeamResponse",
		sendInvitationToTeam:"UsersSendInvitationToTeamResponse"
	},
	UsersProviderLoginQuery:{
		apple:"UsersProviderResponse",
		github:"UsersProviderResponse",
		google:"UsersProviderResponse",
		microsoft:"UsersProviderResponse"
	},
	AdminMemberQuery:{
		showInviteTokens:"UsersInviteToken",
		showTeamInvitations:"UsersInvitationTeamToken"
	},
	UsersInviteToken:{
		_id:"String",
		domain:"String",
		expires:"String",
		owner:"String",
		teamId:"String",
		token:"String"
	},
	MailMutation:{
		sendMail:"Boolean"
	},
	AdminMutation:{
		addProject:"String",
		projectOps:"ProjectOps"
	},
	UsersLoginResponse:{
		accessToken:"String",
		hasError:"UsersLoginErrors",
		login:"String",
		refreshToken:"String"
	},
	UsersJoinToTeamResponse:{
		hasError:"UsersJoinToTeamError",
		result:"Boolean"
	},
	UsersTeamAuthType:{
		_id:"String",
		members:"String",
		name:"String",
		owner:"String"
	},
	UsersJoinToTeamWithInvitationTokenResponse:{
		hasError:"UsersJoinToTeamWithInvitationTokenError",
		result:"Boolean"
	},
	AdminQuery:{
		projects:"Project"
	},
	Project:{
		_id:"String",
		createdAt:"String",
		emails:"String",
		name:"String",
		owner:"String",
		publicKey:"String",
		urls:"String"
	},
	UsersSendInvitationToTeamResponse:{
		hasError:"UsersSendInvitationToTeamError",
		result:"Boolean"
	},
	UsersCreateTeamResponse:{
		hasError:"UsersCreateTeamError",
		result:"String"
	},
	Query:{
		admin:"AdminQuery",
		adminMemberQuery:"AdminMemberQuery",
		getGoogleOAuthLink:"String",
		login:"LoginQuery",
		memberQuery:"MemberQuery",
		user:"UserQuery"
	},
	UsersTeamMember:{
		_id:"String",
		username:"String"
	},
	UsersSocial:{
		_id:"String",
		createdAt:"String",
		socialId:"String",
		userId:"String"
	},
	UsersChangePasswordWithTokenResponse:{
		hasError:"UsersChangePasswordWithTokenError",
		result:"Boolean"
	},
	UserQuery:{
		me:"UsersUser",
		showTeamInvitations:"UsersInvitationTeamToken",
		teams:"UsersTeam"
	},
	Node:{
		"...on Project": "Project",
		_id:"String",
		createdAt:"String"
	},
	PublicMutation:{
		changePasswordWithToken:"UsersChangePasswordWithTokenResponse",
		register:"UsersRegisterResponse",
		verifyEmail:"UsersVerifyEmailResponse"
	}
}

export const Ops = {
mutation: "Mutation" as const,
	query: "Query" as const
}