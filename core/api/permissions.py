from rest_framework.permissions import BasePermission

class IsDonor(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'donor'


class IsNGO(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ngo'


class IsAdmin(BasePermission):
    """Restricts access to admin or staff users only."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.role == 'admin' or request.user.is_staff
        )