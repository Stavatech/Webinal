from django.conf.urls import patterns, url, include 
from filemanager import views 
 
urlpatterns = patterns('filemanager.views',	
	url(r'directory', views.DirectoryDetail.as_view()),
	url(r'operation/(?P<op>[^/]+)/?', views.Operation.as_view()),
	url(r'file', views.FileDetail.as_view()),
	url(r'tabs', views.Tabs.as_view()),
	url(r'transfer', views.FileTransfer.as_view()),
	url(r'settings', views.SettingsDetail.as_view())
) 
