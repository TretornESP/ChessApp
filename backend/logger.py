class Logger:
    def self.__init__(self, app):
        self.app = app
    def log(self, string):
        self.app.logger.info(string)
