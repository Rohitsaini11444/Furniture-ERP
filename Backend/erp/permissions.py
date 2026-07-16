from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow access only to Admin users."""
    message = "Access restricted to Admin users only."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class IsSupervisor(BasePermission):
    """Allow access only to Supervisor users."""
    message = "Access restricted to Supervisor users only."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'supervisor')


class IsContractor(BasePermission):
    """Allow access only to Contractor users."""
    message = "Access restricted to Contractor users only."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'contractor')


class IsAdminOrSupervisor(BasePermission):
    """Allow access to Admin or Supervisor users."""
    message = "Access restricted to Admin or Supervisor users."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role in ('admin', 'supervisor')
        )


class IsSandingSupervisor(BasePermission):
    """Allow access only to Supervisors with batch_category = sanding."""
    message = "Access restricted to Sanding Supervisors only."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == 'supervisor' and
            request.user.batch_category == 'sanding'
        )


class IsAdminOrSandingSupervisor(BasePermission):
    """Allow access to Admin or Sanding Supervisors."""
    message = "Access restricted to Admin or Sanding Supervisors."

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        if user.role == 'admin':
            return True
        return user.role == 'supervisor' and user.batch_category == 'sanding'
