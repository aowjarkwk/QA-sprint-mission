import { beforeEach, describe, expect, jest, test } from "@jest/globals";
import { NextFunction, Request, Response } from "express";
import { assert } from "superstruct";
import * as commentController from "../controllers/commentController";
import * as commentService from "../services/commentService";
import { CreateComment, PatchComment } from "../structs";
import AppError from "../utils/errors";

jest.mock("../services/commentService");
jest.mock("superstruct", () => {
  const originalModule = jest.requireActual<typeof import("superstruct")>("superstruct");
  return {
    ...originalModule,
    assert: jest.fn(),
  };
});

const setup = () => {
  const req = {
    body: {},
    params: {},
    query: {},
    userId: 1,
  } as unknown as Request<{ id: string; commentId: string }> & { userId: number };

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
    sendStatus: jest.fn(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, next };
};

describe("댓글 컨트롤러", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getCommentsByProductId", () => {
    test("상품의 댓글을 반환해야 한다", async () => {
      const { req, res, next } = setup();
      req.params.id = "1";
      const mockComments = [
        {
          id: "1",
          content: "멋진 상품!",
          writer: "테스트 유저",
          createdAt: new Date(),
          updatedAt: new Date(),
          productId: "1",
          articleId: null,
          userId: 1,
        },
      ];
      (
        commentService.getCommentsByProductId as jest.MockedFunction<typeof commentService.getCommentsByProductId>
      ).mockResolvedValue(mockComments);

      await commentController.getCommentsByProductId(req, res, next);

      expect(res.send).toHaveBeenCalledWith(mockComments);
    });
  });

  describe("getCommentsByArticleId", () => {
    test("게시글의 댓글을 반환해야 한다", async () => {
      const { req, res, next } = setup();
      req.params.id = "1";
      const mockComments = [
        {
          id: "1",
          content: "멋진 게시글!",
          writer: "테스트 유저",
          createdAt: new Date(),
          updatedAt: new Date(),
          productId: null,
          articleId: "1",
          userId: 1,
        },
      ];
      (
        commentService.getCommentsByArticleId as jest.MockedFunction<typeof commentService.getCommentsByArticleId>
      ).mockResolvedValue(mockComments);

      await commentController.getCommentsByArticleId(req, res, next);

      expect(res.send).toHaveBeenCalledWith(mockComments);
    });
  });

  describe("createComment", () => {
    test("댓글을 생성해야 한다", async () => {
      const { req, res, next } = setup();
      req.body = { content: "좋아요!" };
      const mockComment = {
        id: "1",
        content: "좋아요!",
        writer: "테스트 유저",
        createdAt: new Date(),
        updatedAt: new Date(),
        productId: null,
        articleId: "1",
        userId: 1,
      };
      (commentService.createComment as jest.MockedFunction<typeof commentService.createComment>).mockResolvedValue(
        mockComment
      );

      await commentController.createComment(req, res, next);

      expect(assert).toHaveBeenCalledWith(req.body, CreateComment);
      expect(commentService.createComment).toHaveBeenCalledWith({ ...req.body, userId: req.userId });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(mockComment);
    });
  });

  describe("updateComment", () => {
    test("댓글을 업데이트해야 한다", async () => {
      const { req, res, next } = setup();
      req.params.commentId = "1";
      req.body = { content: "업데이트된 댓글" };

      const mockUpdatedComment = {
        id: "1",
        content: "업데이트된 댓글",
        writer: "테스트 유저",
        createdAt: new Date(),
        updatedAt: new Date(),
        productId: null,
        articleId: "1",
        userId: 1,
      };
      (commentService.updateComment as jest.MockedFunction<typeof commentService.updateComment>).mockResolvedValue(
        mockUpdatedComment
      );

      await commentController.updateComment(req, res, next);

      expect(assert).toHaveBeenCalledWith(req.body, PatchComment);
      expect(commentService.updateComment).toHaveBeenCalledWith("1", req.userId, "업데이트된 댓글");
      expect(res.send).toHaveBeenCalledWith(mockUpdatedComment);
    });

    test("댓글 수정 시 commentId가 없으면 400 에러를 반환해야 한다", async () => {
      const { req, res, next } = setup();
      req.params.commentId = "";

      await commentController.updateComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "존재하지 않는 댓글입니다." });
    });

    test("댓글 수정 시 content가 없으면 400 에러를 반환해야 한다", async () => {
      const { req, res, next } = setup();
      req.params.commentId = "1";
      req.body.content = "";

      await commentController.updateComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "댓글 내용은 필수값입니다." });
    });

    test("댓글 수정 시 권한이 없으면 예외를 발생시켜야 한다", async () => {
      const { req, res, next } = setup();
      req.params.commentId = "1";
      req.body = { content: "업데이트된 댓글" };

      (commentService.updateComment as jest.MockedFunction<typeof commentService.updateComment>).mockRejectedValue(
        new AppError("댓글을 수정할 권한이 없습니다.", 403)
      );

      await commentController.updateComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "댓글을 수정할 권한이 없습니다." });
    });
  });

  describe("deleteComment", () => {
    test("댓글을 삭제해야 한다", async () => {
      const { req, res, next } = setup();
      req.params.commentId = "1";

      await commentController.deleteComment(req, res, next);

      expect(commentService.deleteComment).toHaveBeenCalledWith("1", req.userId);
      expect(res.sendStatus).toHaveBeenCalledWith(204);
    });

    test("댓글 삭제 시 권한이 없으면 예외를 발생시켜야 한다", async () => {
      const { req, res, next } = setup();
      req.params.commentId = "1";

      (commentService.deleteComment as jest.MockedFunction<typeof commentService.deleteComment>).mockRejectedValue(
        new AppError("댓글을 삭제할 권한이 없습니다.", 403)
      );

      await commentController.deleteComment(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "댓글을 삭제할 권한이 없습니다." });
    });
  });
});