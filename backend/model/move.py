import chess

class Move():
    def __init__(self, p, f, t, c=None):
        self.p = p
        self.f = int(f)
        self.t = int(t)
        self.c = c
        if c == None:
            self.move = chess.Move(self.f, self.t)
        else:
            self.move = chess.Move(self.f, self.t, self.c)
    def get_player(self):
        return self.p
    def get_from(self):
        return self.f
    def get_to(self):
        return self.t
    def get_crown(self):
        return self.c
    def get_move(self):
        return self.move
    def invalid_move(self):
        return "invalid movement"
