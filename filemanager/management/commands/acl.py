from django.core.management.base import BaseCommand

import os, json, mimetypes, platform, shutil, traceback, sys

from filemanager.objects import *
from filemanager.models import *

class Command(BaseCommand):
    args = '<Operation [param_1 param_2 ...]>'
    help = 'Parameters are specific to the operation being performed'
    
    def handle(self, *args, **options):
        
        op = args[0]
        output = ""
        
        try:
            if op == "GET_DIR":
                path = args[1]
                if path.endswith(":"):
                    path += "\\"                            
                directory = Directory(path)
                output = directory.to_JSON()
            elif op == "CREATE_TEMP_FILE":                    
                path = args[1]
                output = args[2]
                
                if os.path.exists(output):
                    os.remove(output)                   
                    
                shutil.copyfile(path, output)
                os.chmod(output, 0755)             
            elif op == "CREATE":            
                dir_obj = DirectoryObject(args[1], args[2], args[3])
                dir_obj.create()            
            elif op == "RENAME":
                dir_obj = DirectoryObject(args[1], args[2], args[3])
                dir_obj.rename()
            elif op == "MOVE":
                dir_obj = DirectoryObject(args[1], args[2], args[3])
                dir_obj.move(args[4])
            elif op == "COPY":
                dir_obj = DirectoryObject(args[1], args[2], args[3])
                dir_obj.copy(args[4])
            elif op == "DELETE":
                dir_obj = DirectoryObject(args[1], args[2], args[3])
                dir_obj.delete()
            elif op == "OVERWRITE_FILE":                
                path = args[1]
                tmp_file = args[2]
                shutil.copyfile(tmp_file, path)   
                os.remove(tmp_file)
            elif op == "STAT":              
                path = args[1]
                statinfo = os.stat(path)
                for item in enumerate(statinfo):
                    output += str(item[1]) + "\n"
            else:
                output = "ERROR:\n\nInvalid operation"
        except Exception, err:
            output = "ERROR:\n\n%s" % str(err)
        
        return output
