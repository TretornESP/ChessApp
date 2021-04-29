from chess import Termination

class Ending(chess.Termination):
    def __init__(self, outcome, winner):
        if 0 < outcome <= 10:
            super().__init__(outcome, winner)
            self.valid = True
        else:
            self.valid = False
            
    def get_outcome(self):
        if self.valid:
            return self.termination
        else:
