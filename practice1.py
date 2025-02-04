# # def adj(n, edges, matrix):
# #     # adj = {i:{"neighbors": [], "degree": 0} for i in range(1,n+1)}
# #     visited_matrix = [ [ 0 for i in range(len(matrix)) ] for j in range(len(matrix[0])) ]
# #     print(visited_matrix)

# #     nodes = len(matrix) * len(matrix[0]) # No +1 is needed because len() give you 1 indexed value
# #     adj_list = {i: [] for i in range(1, nodes)}
# #     print(adj_list)

# #     # for u, v in edges:
# #     #     adj[u].get("neighbors").append(v)
# #     #     adj[v].get("neighbors").append(u) # If we comment this line the graph become directed from bidirectional or undirected
# #     #     adj[u].update(degree = adj[u].get("degree") + 1)
# #     #     adj[v].update(degree = adj[v].get("degree") + 1) # If we comment this line the graph become directed from bidirectional or undirected
       
# #     # return adj


# def dfs(r,c):
#     stack = [(r,c)] # We initialize the stack with the first_node 
#                 visited_matrix[r][c] = 1 # We visit the node as it has been appended to the stack
#                 area = 0
#                 while stack: # while len(stack) > 0
#                     cn = stack.pop() # LIFO for DFS

#                     row = cn[0]
#                     col = cn[1]
#                     if matrix[row][col] == 1:
#                         # Are the neighbors valid first
#                         # We can have 4
#                         # right = cn[cn[0]+0][cn[1]+1]
#                         if col+1 < len(matrix[0]): # We can't reach it
#                             if matrix[row][col+1] == 1:
#                                 area = area + 1
#                                 visited_matrix[row][col+1] = 1
#                                 stack.append((row, col+1))
#                             else:
                                
#                         else:
#                             pass

                            
#                         if col-1 >= 0 and matrix[row][col-1] == 1:
#                             visited_matrix[row][col-1] = 1
#                             stack.append((row, col-1))
#                         if row+1 < len(matrix) and matrix[row+1][col] == 1:
#                             visited_matrix[row+1][col] = 1
#                             stack.append(row+1, col)
#                         if row-1 >= 0 and matrix[row-1][col] == 1:
#                             visited_matrix[row-1][col] = 1
#                             stack.append(row-1, col)


#                     else:
#                         # If there is water and no land , we dont need to check for neighbours
#                         visited_matrix[row][col] = 1




# def adj(n, edges, matrix):
#     # adj = {i:{"neighbors": [], "degree": 0} for i in range(1,n+1)}
#     visited_matrix = [ [ 0 for i in range(len(matrix)) ] for j in range(len(matrix[0])) ]
#     print(visited_matrix)

#     nodes = len(matrix) * len(matrix[0]) # No +1 is needed because len() give you 1 indexed value
#     adj_list = {i: [] for i in range(1, nodes)}
#     print(adj_list)

    
#     visited_matrix[0][0] = 1 # We visited the node as soon as we append it to the stack

#     # We can go    Right  down    up     left
#     directions = [(0,1), (1,0), (-1,0), (0,-1)]

#     for r in range(len(matrix)):
#         for c in range(len(matrix[0])):
           
#            if visited_matrix[r][c] == 0: # We treat each element in the matrix as the starting node, iff it has not been visited
                
            
#            else:
#                continue






    
if __name__ == "__main__":
    n = 5
    edges = [
        (1, 2),  # Group 1
        (1, 5),  # Group 1
        (1, 3),  # Group 2
        (2, 4),  # Group 1
        (3, 4)   # Group 2
    ]

    matrix = [
        [1,0],
        [0,1]
    ]

    # no of nodes = number of rows * number of columns
    
    result = adj(n, edges, matrix)
    for node, neighbors in result.items():
        print(f"{node}: {neighbors}")