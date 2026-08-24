from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import UserSession


class SessionJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication class that validates:
    1. Account is active (user.is_active == True)
    2. Specific device session is active (UserSession.is_active == True) if X-Session-ID header is provided.
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)

        # Check Account Active Status
        if not user.is_active:
            raise AuthenticationFailed({
                'code': 'account_disabled',
                'detail': 'Your account has been disabled by an Administrator.'
            })

        # Check Session Active Status (if X-Session-ID header is present)
        session_id = request.headers.get('X-Session-ID') or request.META.get('HTTP_X_SESSION_ID')
        if session_id:
            try:
                session_id_int = int(session_id)
                session_active = UserSession.objects.filter(id=session_id_int, user=user, is_active=True).exists()
                if not session_active:
                    raise AuthenticationFailed({
                        'code': 'session_revoked',
                        'detail': 'Your active session has been terminated by an Administrator.'
                    })
            except (ValueError, TypeError):
                pass

        return user, validated_token
