import os, shutil, platform, json

class DirectoryObject:
    
    def __init__(self, name, fullpath, type):
        self.name = name
        self.fullpath = fullpath
        self.type = type
    
    
    def create(self):
        name = os.path.join(self.fullpath, self.name)
        
        if os.path.exists(self.fullpath):
            if self.type == "directory":
                os.makedirs(name)
            else:
                open(name, 'a').close()
        else:
            raise Exception("Parent directory does not exist")
    
    
    def rename(self):
        newpath = os.path.join(os.path.dirname(self.fullpath), self.name)
        os.rename(self.fullpath, newpath)
    
    
    def copy(self, dst):
        if os.path.isdir(self.fullpath):
            shutil.copytree(self.fullpath, os.path.join(dst, self.name))
        else:
            shutil.copy(self.fullpath, dst)
    
    
    def move(self, dst_dir):
        shutil.move(self.fullpath, os.path.join(dst_dir, self.name))
    
    
    def delete(self):
        if os.path.isdir(self.fullpath):
            shutil.rmtree(self.fullpath)
        else:
            os.remove(self.fullpath)



class Directory:

    def __init__(self, path):    
        self.cwd = self.GetDirectoryDetails(path)
        self.dir_contents = self.ListDir(path)    
    
    
    def GetDirectoryDetails(self, path):
        cwd = []
                    
        dirs = path.split(os.path.sep)
        
        #On non-Windows machines, the first item in the directory array will be a /
        if platform.system != "Windows":
            dirs[0] = os.path.sep
        
        index = 0    
        for dir in dirs:
            if len(dir) > 0:
                path = dir
                                
                if index >= 1:                    
                    path = os.path.join(cwd[index - 1].fullpath, dir)
                    dir = dir + os.path.sep                
                
                obj = DirectoryObject(dir, path, "directory")
                cwd.append(obj)
            else:
                break
            
            index += 1
        return cwd
    
    
    def ListDir(self, path):
        dir_contents = []
    
        files = os.listdir(path)
        
        for f in files:
            obj = None
            if os.path.isdir(os.path.join(path,f)):
                obj = DirectoryObject(f, os.path.join(path, f), "directory")
            else:
                obj = DirectoryObject(f, os.path.join(path, f), "file")
                
            dir_contents.append(obj)
            
        return dir_contents
    
    
    def to_JSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)
    

class Settings:
    
    def __init__(self, home_directory, theme, font_size):
        self.home_directory = home_directory
        self.theme = theme
        self.font_size = font_size
        
    
    def to_JSON(self):
        return json.dumps(self, default=lambda o: o.__dict__, sort_keys=True, indent=4)
