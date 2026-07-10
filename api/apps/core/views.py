from rest_framework.decorators import api_view
from rest_framework.response import Response

from .serializers import HealthSerializer


@api_view(["GET"])
def health(request):
    data = {"status": "ok", "service": "caisbe-api"}
    serializer = HealthSerializer(data)
    return Response(serializer.data)
